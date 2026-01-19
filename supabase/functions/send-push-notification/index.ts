import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Expo Push Notification API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
  channelId?: string
  priority?: 'default' | 'normal' | 'high'
}

interface NotificationRecord {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  push_token: string | null
}

function getChannelId(notificationType: string): string {
  switch (notificationType) {
    case 'assignment':
      return 'assignments'
    case 'unassignment':
      return 'unassignments'
    case 'retroactive_assignment':
      return 'retroactive'
    default:
      return 'default'
  }
}

async function sendExpoPushNotification(message: ExpoPushMessage): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()

    if (result.data?.[0]?.status === 'ok') {
      return { success: true }
    }

    return {
      success: false,
      error: result.data?.[0]?.message || 'Unknown error',
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { notification_id, process_pending = false } = await req.json()

    // If process_pending is true, process all unsent notifications
    if (process_pending) {
      const { data: pendingNotifications, error: fetchError } = await supabase
        .from('notifications')
        .select('id, user_id, type, title, body, data, push_token')
        .is('sent_at', null)
        .not('push_token', 'is', null)
        .order('created_at', { ascending: true })
        .limit(100)

      if (fetchError) {
        throw new Error(`Failed to fetch notifications: ${fetchError.message}`)
      }

      const results = []

      for (const notification of (pendingNotifications || []) as NotificationRecord[]) {
        if (!notification.push_token) continue

        const message: ExpoPushMessage = {
          to: notification.push_token,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
          priority: 'high',
          channelId: getChannelId(notification.type),
        }

        const result = await sendExpoPushNotification(message)

        // Update notification record
        await supabase
          .from('notifications')
          .update({
            sent_at: result.success ? new Date().toISOString() : null,
            send_error: result.error || null,
          })
          .eq('id', notification.id)

        results.push({
          id: notification.id,
          success: result.success,
          error: result.error,
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          results,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Process single notification
    if (!notification_id) {
      throw new Error('notification_id or process_pending is required')
    }

    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, body, data, push_token')
      .eq('id', notification_id)
      .single()

    if (notifError || !notification) {
      throw new Error(`Notification not found: ${notifError?.message}`)
    }

    if (!notification.push_token) {
      // Try to get push token from user
      const { data: user } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', notification.user_id)
        .single()

      if (!user?.push_token) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No push token available for user',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      notification.push_token = user.push_token
    }

    const message: ExpoPushMessage = {
      to: notification.push_token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: 'default',
      priority: 'high',
      channelId: getChannelId(notification.type),
    }

    const result = await sendExpoPushNotification(message)

    // Update notification record
    await supabase
      .from('notifications')
      .update({
        sent_at: result.success ? new Date().toISOString() : null,
        send_error: result.error || null,
      })
      .eq('id', notification_id)

    return new Response(
      JSON.stringify({
        success: result.success,
        error: result.error,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
