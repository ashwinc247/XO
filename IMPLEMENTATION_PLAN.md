# Implementation Plan: Production Authentication & Referral Migration

## 1. Current Authentication Architecture
- **Method:** Username/Email + Password with OTP verification.
- **Session:** JWT access token stored in localStorage (Client) and JWT refresh token stored in httpOnly cookie.
- **Service:** `authService.js` handles token generation, password hashing (bcrypt), and session management.

## 2. Current User Model
- `User` schema contains: `username`, `email`, `password`, `role` (guest, player, admin), `isEmailVerified`, `status`, and `lastLogin`.
- `Profile` schema contains: `displayName`, `avatarUrl`, `referralCode`, `referredBy`, etc.

## 3. Current Referral Model/Logic
- Referral codes are generated at registration and stored in the `Profile`.
- The current implementation processes referrals strictly during the `register` function.
- Rewards (Level 1: ₹10, Level 2: ₹5) are deposited into `bonusRewardBalance` and recorded in `BonusTransaction`.

## 4. Current Wallet/Reward Architecture
- Balances are split into `walletBalance` and `bonusRewardBalance` (inside `Profile`).
- Betting matches deduct/deposit to `walletBalance`.
- Match commissions (Level 1: 2%, Level 2: 1%) are paid into `bonusRewardBalance` as transactions.

## 5. Current Admin Authentication
- Admin uses the exact same `login` flow. The JWT decodes to `role: 'admin'`, and the frontend redirects to `/admin/dashboard`.
- **Requirement:** Admin authentication must not be broken. If we remove password login, how does Admin log in? *Plan: Keep a hidden or separate `/admin/login` path, OR allow the specific admin Google account to map to the admin role, OR retain the password login specifically for admins under a different endpoint.*

## 6. Current Socket.IO Authentication
- Socket connects using `socket.handshake.auth.token` containing the JWT access token.
- Token is verified, and `socket.user` is populated with `{ userId, role, username }`.
- **Impact:** Since we continue using the exact same JWT format after Google OAuth, Socket.IO authentication will remain 100% intact and unaffected.

## 7. Current Database Collections
- `users`, `profiles`, `matches`, `matchsettlements`, `transactions`, `bonustransactions`, `sessions`, `settings`, `supporttickets`, `platformconfigs`.

## 8. Test/Dummy Data Identification Method
- There is no specific `isTest` flag.
- **Strategy:** All users where `role !== 'admin'` are considered development/test users. We will identify the admin account(s), preserve them (and their profiles/settings), and delete all other users, matches, and financial logs.

## 9. Files That Will Be Modified
**Backend:**
- `server/models/User.js`: Make `password` optional, add `googleId` (`sub`).
- `server/services/authService.js`: Implement robust `googleLogin` using Google API verification (instead of the dummy implementation). Remove password reqs for new Google users.
- `server/controllers/authController.js` & `server/routes/authRoutes.js`: Clean up unneeded routes (register, forgot-password, etc.), keeping `googleLogin`, `refreshToken`, `logout`, `me`, and a potential admin login.
- `server/routes/rewardRoutes.js` & `server/controllers/rewardController.js`: Add a new endpoint to apply a referral code post-registration.

**Frontend:**
- `client/src/App.jsx`: Add logic to capture `?ref=...` from URL and store in `localStorage`.
- `client/src/pages/auth/Login.jsx`: Redesign to feature "Continue with Google", removing username/password fields.
- `client/src/context/AuthContext.jsx`: Implement the updated Google OAuth flow with `@react-oauth/google`.
- `client/src/pages/Rewards.jsx`: Implement the referral code popup for users who haven't been referred yet.

## 10. Production Cleanup Strategy
- Create a script `server/scripts/productionCleanup.js`.
- **Steps:**
  1. Find the admin user(s).
  2. Delete all `User` documents where `role !== 'admin'`.
  3. Delete `Profile`, `Settings`, `Session` documents where `user` is not the admin's ID.
  4. Truncate `Match`, `MatchSettlement`, `Transaction`, `BonusTransaction`.
  5. Print a summary of deleted records.
