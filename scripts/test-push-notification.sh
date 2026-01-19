#!/bin/bash
# Test Push Notification Script
# Usage: ./test-push-notification.sh [driver_user_id]

SUPABASE_URL="https://vmsfsstxxndpxbsdylog.supabase.co"

# Check if SUPABASE_SERVICE_KEY is set
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "Error: SUPABASE_SERVICE_KEY environment variable is not set"
    echo "Usage: SUPABASE_SERVICE_KEY=your_key ./test-push-notification.sh"
    exit 1
fi

echo "Testing Push Notifications..."
echo ""

# Option 1: Process all pending notifications
echo "Processing all pending notifications..."
curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/send-push-notification" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"process_pending": true}' | jq .

echo ""
echo "Done!"
