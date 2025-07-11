# Push Notifications Setup Guide

## Web Push Notifications (VAPID Configuration)

To enable push notifications on web platforms, you need to configure VAPID (Voluntary Application Server Identification) keys.

### Step 1: Generate VAPID Keys

You can generate VAPID keys using one of these methods:

#### Option A: Using web-push library (Node.js)
```bash
npm install -g web-push
web-push generate-vapid-keys
```

#### Option B: Using online generator
Visit: https://vapidkeys.com/ (or similar trusted VAPID key generator)

#### Option C: Using Expo CLI
```bash
npx expo install @expo/web-push
npx expo generate:vapid-keys
```

### Step 2: Configure app.json

✅ **COMPLETED**: The VAPID public key has been configured in `app.json`:

```json
{
  "expo": {
    "notification": {
      "icon": "./assets/icon.png",
      "color": "#000000",
      "vapidPublicKey": "BNyu9x_wfp4jkR9oqs74wP7fpHWoMI_4OI-Lt6jSl-RZzxcLCTmXUu75uXLOZ8n13ruOlpgy8wsK9w79ypdJTNc"
    }
  }
}
```

### Step 3: Store Private Key Securely

**IMPORTANT**: Never commit your VAPID private key to version control!

🔑 **Your VAPID Private Key**: `pOW5Y3EkK7jlT_RpHRpxG8T7967Peo5JhNSV0hbOEZc`

**⚠️ SECURITY REMINDER**: 
- Store this private key in your server environment variables (e.g., `VAPID_PRIVATE_KEY`)
- Use it when sending push notifications from your backend
- Never include it in your client-side code or commit it to version control
- The public key in `app.json` is safe to commit

### Step 4: Backend Configuration

If you're using a backend service to send push notifications, configure it with:
- VAPID public key (from app.json)
- VAPID private key (from environment variables)
- Your contact email or website URL

### Security Notes

1. **Public Key**: Safe to include in your app bundle and version control
2. **Private Key**: Must be kept secret and stored securely on your server
3. **Key Rotation**: Consider rotating VAPID keys periodically for security

### Testing

After configuration:
1. Build and deploy your web app
2. Test push notification registration
3. Verify tokens are generated successfully
4. Test sending notifications from your backend

### Troubleshooting

- **Error: "vapidPublicKey required"**: Ensure the key is properly set in app.json
- **Invalid key format**: Verify the key is base64url encoded
- **Permission denied**: Check browser notification permissions
- **Network errors**: Verify your backend VAPID configuration

For more information, see:
- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [Web Push Protocol RFC](https://tools.ietf.org/html/rfc8030)