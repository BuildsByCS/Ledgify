# API Routes Documentation

This document outlines the API routes for the Ledgify application, detailing their purpose, HTTP methods, endpoints, any applicable middleware, and example outputs.

## Authentication Routes

- **`POST /api/auth/register`**
  - **Description**: Registers a new user account.
  - **Access**: Public
  - **Request Body**:
    ```json
    {
        "username": "string",
        "email": "string",
        "password": "string"
    }
    ```
  - **Output**:
    ```json
    {
        "success": true,
        "message": "Registration successful",
        "user": {
            "_id": "...",
            "email": "...",
            "username": "..."
        }
    }
    ```

- **`POST /api/auth/login`**
  - **Description**: Authenticates a user and provides access tokens.
  - **Access**: Public
  - **Request Body**:
    ```json
    {
        "email": "string",  //test@gmail.com
        "password": "string"  //test123
    }
    ```
  - **Output**:
    ```json
    {
        "message": "User logged in successfully",
        "user": {
            "_id": "...",
            "email": "...",
            "name": "..."
        },
        "token": "..."
    }
    ```

- **`GET /api/auth/me`**
  - **Description**: Retrieves the details of the currently authenticated user.
  - **Access**: Protected (Requires authentication via `authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "user": {
            "_id": "...",
            "email": "test@gmail.com",
            "name": "test test"
        }
    }
    ```

- **`POST /api/auth/logout`**
  - **Description**: Logs out the currently authenticated user by invalidating their session/tokens.
  - **Access**: Protected (Requires authentication via `authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "message": "User logged out successfully"
    }
    ```

## Account Routes

- **`POST /api/accounts/create`**
  - **Description**: Creates a new financial account for the logged-in user.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json

    {
       "account": {
           "user": "...",
           "status": "ACTIVE",
           "currency": "INR",
           "_id": "...",
           "createdAt": "2026-02-27T06:21:08.798Z",
           "updatedAt": "2026-02-27T06:21:08.798Z",
           "__v": 0
       }
    }

    ```

- **`GET /api/accounts`**
  - **Description**: Retrieves all financial accounts belonging to the logged-in user.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
      "accounts": [
          {
              "_id": "...",
              "user": "...",
              "status": "ACTIVE",
              "currency": "INR",
              "createdAt": "2026-02-12T13:47:33.420Z",
              "updatedAt": "2026-02-12T13:47:33.420Z",
              "__v": 0
          },
          {
              "_id": "...",
              "user": "...",
              "status": "ACTIVE",
              "currency": "INR",
              "createdAt": "2026-02-27T06:21:08.798Z",
              "updatedAt": "2026-02-27T06:21:08.798Z",
              "__v": 0
          }
      ]
    }
    ```

- **`GET /api/accounts/balance/:accountId`**
  - **Description**: Fetches the balance of a specific account identified by `accountId` for the logged-in user.
  - **Parameters**:
    - `accountId`: string (URL parameter) - The ID of the account.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "accountId": "...",
        "balance": 0
    }
    ```

- **`GET /api/accounts/total-balance`**
  - **Description**: Retrieves the total balance across all financial accounts for the logged-in user.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "totalBalance": 15000
    }
    ```

- **`GET /api/accounts/ledger-chart/:accountId`**
  - **Description**: Get ledger entries for chart display (last 7 days) of a specific account identified by `accountId` for the logged-in user.
  - **Parameters**:
    - `accountId`: string (URL parameter) - The ID of the account.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "accountId": "...",
        "transactions": [
            {
                "amount": 15000,
                "type": "CREDIT",
                "createdAt": "2026-02-26T06:26:43.769Z"
            }
        ]
    }
    ```

- **`GET /api/accounts/ledger-list?accountId=xxx&page=1&limit=10`**
  - **Description**: Get paginated ledger entries for list display of a specific account identified by `accountId` for the logged-in user.
  - **Parameters**:
    - `accountId`: string (Query parameter) - The ID of the account.
    - `page`: number (Query parameter) - The page number for pagination.
    - `limit`: number (Query parameter) - The number of entries per page.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "accountId": "...",
        "transactions": [
            {
                "amount": 15000,
                "transaction": "...",
                "type": "CREDIT",
                "createdAt": "2026-02-26T06:26:43.769Z"
            }
        ],
        "pagination": {
            "currentPage": 1,
            "totalPages": 1,
            "totalEntries": 1,
            "limit": 10
        }
    }
    ```

- **`POST /api/accounts/update-status?accountId=xxx&status=ACTIVE/CLOSED`**
  - **Description**: Update an account's status to ACTIVE or CLOSED.
  - **Parameters**:
    - `accountId`: string (Query parameter) - The ID of the account.
    - `status`: string (Query parameter) - The new status of the account (ACTIVE or CLOSED).
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "message": "Account status updated successfully",
        "account": {
            "_id": "...",
            "user": "...",
            "status": "CLOSED",
            "currency": "INR",
            "createdAt": "2026-02-27T06:21:08.798Z",
            "updatedAt": "2026-02-27T06:35:25.027Z",
            "__v": 0
        }
    }
    ```

- **`POST /api/accounts/freeze/:accountId`**
  - **Description**: Freezes a specific account. Only accessible by a system user.
  - **Parameters**:
    - `accountId`: string (URL parameter) - The ID of the account.
  - **Access**: Protected (Requires system user authentication via `authMiddleware.authSystemUserMiddleware`)
  - **Output**:
    ```json
    {
        "message": "Account frozen successfully",
        "account": {
            "_id": "...",
            "user": "...",
            "status": "FROZEN",
            "currency": "INR",
            "createdAt": "2026-02-12T13:47:33.420Z",
            "updatedAt": "2026-02-27T06:42:01.874Z",
            "__v": 0
        }
    }
    ```

- **`POST /api/accounts/defreeze/:accountId`**
  - **Description**: DeFreezes a specific account & make it ACTIVE for user. Only accessible by a system user.
  - **Parameters**:
    - `accountId`: string (URL parameter) - The ID of the account.
  - **Access**: Protected (Requires system user authentication via `authMiddleware.authSystemUserMiddleware`)
  - **Output**:
    ```json
    {
        "message": "Successfully defrozen and activated the account",
        "account": {
            "_id": "...",
            "user": "...",
            "status": "ACTIVE",
            "currency": "INR",
            "createdAt": "2026-02-12T13:47:33.420Z",
            "updatedAt": "2026-02-27T07:01:51.922Z",
            "__v": 0
        }
    }
    ```

## Transaction Routes

- **`POST /api/transactions/`**
  - **Description**: Creates a new financial transaction.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Input**
    ```json
      {
          "fromAccount": "...id",
          "toAccount": "...id",
          "amount": 1000,
          "idempotencyKey": "019c725f-43no-34me-6934-5niowe830bw3"
      }
    ```
  - **Output**:
    ```json
    {
        "message": "Transaction completed successfully",
        "transaction": {
            "_id": "...",
            "fromAccount": "...id",
            "toAccount": "...id",
            "status": "COMPLETED",
            "amount": 1000,
            "idempotencyKey": "019c725f-43no-34me-6934-5niowe830bw3",
            "createdAt": "2026-02-27T07:07:00.713Z",
            "updatedAt": "2026-02-27T07:07:00.868Z",
            "__v": 0
        }
    }
    ```

- **`POST /api/transactions/system/initial-funds`**
  - **Description**: Records an initial funds transaction, typically created by a system user.
  - **Access**: Protected (Requires system user authentication via `authMiddleware.authSystemUserMiddleware`)
  - **Input**
    ```json
      {
          "toAccount": "...id",
          "amount": 500,
          "idempotencyKey": "019c619c-5920-7d06-a45j-3cc50a3b905a"
      }
  
    ```
  - **Output**:
    ```json
    {
        "message": "Transaction successfull",
        "transaction": {
            "_id": "...",
            "fromAccount": "...id",
            "toAccount": "...id",
            "status": "COMPLETED",
            "amount": 500,
            "idempotencyKey": "019c619c-5920-7d06-a45j-3cc50a3b905a",
            "createdAt": "2026-02-27T06:45:02.412Z",
            "updatedAt": "2026-02-27T06:45:02.536Z",
            "__v": 0
        }
    }
    ```


