import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// สร้าง Expo client
const expo = new Expo();

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * ส่ง Push Notification ไปยังหลายคน
 */
export async function sendPushNotifications(
  tokens: string[], 
  notification: NotificationData
): Promise<ExpoPushTicket[]> {
  console.log(`📤 Preparing to send notifications to ${tokens.length} devices...`);
  
  const messages: ExpoPushMessage[] = [];
  
  // สร้าง messages array
  for (const token of tokens) {
    // เช็คว่า token ถูกต้องหรือไม่
    if (!Expo.isExpoPushToken(token)) {
      console.error(`❌ Token ${token} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: 'high',
      channelId: 'default'
    });
  }

  console.log(`✓ Created ${messages.length} valid messages`);

  // แบ่ง messages เป็น chunks (100 messages/chunk)
  const chunks = expo.chunkPushNotifications(messages);
  console.log(`✓ Split into ${chunks.length} chunks`);
  
  const tickets: ExpoPushTicket[] = [];

  // ส่งแต่ละ chunk
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      console.log(`✓ Sent chunk of ${chunk.length} notifications`);
    } catch (error) {
      console.error('❌ Error sending chunk:', error);
    }
  }

  // สรุปผลลัพธ์
  const successCount = tickets.filter(t => t.status === 'ok').length;
  const errorCount = tickets.filter(t => t.status === 'error').length;
  
  console.log(`📊 Results: ${successCount} success, ${errorCount} errors`);

  return tickets;
}

/**
 * ตรวจสอบสถานะการส่ง
 */
export async function checkNotificationReceipts(tickets: ExpoPushTicket[]): Promise<void> {
  console.log(`🔍 Checking receipts for ${tickets.length} tickets...`);
  
  const receiptIds = tickets
    .filter((ticket): ticket is ExpoPushTicket & { id: string } => 'id' in ticket && typeof ticket.id === 'string')
    .map(ticket => ticket.id);

  if (receiptIds.length === 0) {
    console.log('⚠️ No receipt IDs to check');
    return;
  }

  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  
  for (const chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      
      for (const receiptId in receipts) {
        const receipt = receipts[receiptId];
        
        if (receipt.status === 'ok') {
          console.log('✅ Notification delivered successfully');
        } else if (receipt.status === 'error') {
          console.error('❌ Error:', receipt.message);
          
          if (receipt.details?.error === 'DeviceNotRegistered') {
            console.log('⚠️ Token expired - should remove from database');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking receipts:', error);
    }
  }
}
