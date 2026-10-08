# DopiPOS Security Specification & Rules Architecture

## 1. Data Invariants

1. **Isolation & Store Scoping**: A regular USER cannot read, list, create, update, or delete products, categories, orders, customers, inventory records, or tables belonging to another store/user.
2. **Default Deny**: Any unmatched document path is strictly denied (`allow read, write: if false;`).
3. **Role Elevation Shield**: Regular users cannot write to `/admins/{adminId}` or elevate their own role to 'admin' in `/users/{userId}`.
4. **Bootstrapped Admin**: Runtime user `nhgb2605@gmail.com` or documents in `/admins/{uid}` are validated as administrators.
5. **Activation Code Vault**: Normal users CANNOT query, list, or read the `/activationCodes` collection directly via the client SDK. Activation code redemption is processed exclusively through atomic server operations or transactions where redemption is verified and single-use is enforced.
6. **Order Immutability**: Once an order is marked `completed` or `cancelled`, line items, paymentMethod, and total amount cannot be maliciously overwritten.
7. **Inventory Audit Integrity**: Inventory transaction records cannot have their timestamps or previousStock altered after creation.
8. **Subscription Exclusivity**: A user can only read their own subscription record.
9. **No Client Claim Reliance**: `isAdmin()` is verified through secure database lookup `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or matching bootstrapped admin `request.auth.token.email == 'nhgb2605@gmail.com'`.

---

## 2. The "Dirty Dozen" Threat Payloads

1. **Payload 1 (Cross-Store Data Theft)**: User B attempts to read `/products/{productId}` belonging to User A (`storeId != userB.storeId`).
2. **Payload 2 (Admin Role Hijacking)**: User B attempts to update their own profile document `/users/{userId}` with `role: "admin"`.
3. **Payload 3 (Activation Code Harvesting)**: User B attempts to list all unredeemed activation codes from `/activationCodes`.
4. **Payload 4 (Client-Side Code Self-Redemption)**: User B attempts to directly write `redeemed: true` to `/activationCodes/{codeId}` from the client SDK.
5. **Payload 5 (Unauthenticated Order Injection)**: Unauthenticated visitor attempts to create an order in `/orders/{orderId}`.
6. **Payload 6 (Shadow Field Injection in Products)**: Malicious client sends a product document containing undeclared fields (`isAdminPayload: true`, `backdoor: "..."`).
7. **Payload 7 (Denial of Wallet Document ID Poisoning)**: Malicious client attempts to create a document with a 2MB junk ID string.
8. **Payload 8 (Negative Price or Quantity Tampering)**: Malicious user creates an order item with negative prices or subtotal.
9. **Payload 9 (Customer PII Scraping)**: User B attempts to read customer phone numbers from User A's store.
10. **Payload 10 (Order Total Tampering Post-Completion)**: User attempts to modify the `total` or `paymentMethod` of a completed order.
11. **Payload 11 (Subscription Date Forgery)**: User attempts to extend their own `endDate` in `/subscriptions/{id}` from the client.
12. **Payload 12 (Admin Bypass Spoofing)**: Attacker sends an unverified email claiming to be `nhgb2605@gmail.com` without `email_verified == true`.

---

## 3. Test Runner Design

All 12 attacks are targeted against `firestore.rules` and backend validation barriers to ensure they result in `PERMISSION_DENIED`.
