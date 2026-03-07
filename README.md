
# Ledgify

A ledger‑based financial transaction system implementing **ACID‑safe money transfers, idempotent APIs, and double‑entry accounting**.

Built using **Node.js, Express, MongoDB, and Mongoose**.  

The project simulates the architecture used in real financial systems where **balances are derived from immutable ledger entries instead of being directly updated**.

The system supports secure money transfers between accounts, bonus distribution, system‑controlled deposits, and full transaction history while ensuring **data consistency and financial integrity**.

Ledgify follows an **append-only ledger architecture**, similar to systems used in payment processors and financial platforms.

---


# Key Features

## Double‑Entry Ledger System

Every financial transaction generates two immutable ledger entries:

```
Sender Account   => DEBIT
Receiver Account => CREDIT
```

Balances are never stored directly and are derived using:

```
Balance = Total Credits - Total Debits
```

This ensures:

- complete auditability
- no balance corruption
- immutable financial history

---

## ACID Transaction Safety

All financial operations run inside **MongoDB sessions and transactions**.

```
1) Start Session

2) Create Transaction (PENDING)

3) Create DEBIT Ledger Entry

4) Create CREDIT Ledger Entry

5) Mark Transaction COMPLETED

6) Commit Transaction & end session
```

If any step fails, the entire operation is **rolled back automatically**, preventing partial transfers.

---

## Idempotent Transaction Processing

To prevent duplicate transfers caused by retries or network failures, every transaction requires a **unique idempotency key**.

If the same request is sent again:

- the system detects the existing transaction
- returns the previous result instead of executing again

This protects against **duplicate payments and double spending**.

---

## Monetary Precision Handling

All financial values are stored in the smallest currency unit (**paise**) instead of rupees.

Example:

```
₹100 => 10000 paise
```

This prevents floating‑point precision errors common in financial calculations.

Utility helpers were implemented:

```
toPaise()
toRupees()
```

---

## Optimized Database Queries

Several optimizations were implemented to improve performance.

### Lean Queries

Used `.lean()` in read-heavy endpoints to return plain JavaScript objects instead of full Mongoose documents, reducing memory overhead and improving query performance.

### Selective Field Projection

Only required fields are fetched from the database using `.select()`, minimizing data transfer and improving response time.

### Compound Indexing

Indexes were added to optimize frequently executed queries such as transaction history and ledger lookups.

## Secure Account Controls

The system supports administrative account controls such as:

- freezing accounts
- defreezing accounts

System‑level operations are protected by **system user authentication middleware**.

---

## Pagination for Transaction History

Ledger and transaction history endpoints support pagination:

```
GET /api/transactions?accountId=xxx&page=1&limit=10
```

This prevents large datasets from affecting API performance.

---

# Tech Stack

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose

## Concepts Used

- ACID transactions
- double‑entry ledger accounting
- idempotent APIs
- database indexing
- pagination
- immutable financial records

---

# Project Purpose

This project was built to understand how **real‑world financial systems manage transactions, consistency, and auditability** using modern backend technologies.


---

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


- **`GET /api/accounts/all`**
  - **Description**: Retrieves all financial accounts throughout the Ledgify platform along with its user details.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "allAccounts": [
            {
                "_id": "...",
                "user": {
                    "_id": "...",
                    "email": "...",
                    "name": "..."
                },
                "status": "ACTIVE",
                "currency": "INR",
                "createdAt": "2026-02-12T13:47:33.420Z",
                "updatedAt": "2026-03-04T06:22:09.583Z",
                "__v": 0
            },
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
        "balance": 0.00
    }
    ```

- **`GET /api/accounts/total-balance`**
  - **Description**: Retrieves the total balance across all financial accounts for the logged-in user.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Output**:
    ```json
    {
        "totalBalance": 15000.00
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

- **`POST /api/accounts/update-status`**
  - **Description**: Update an account's status to ACTIVE or CLOSED.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Input**:
    ```json
    {
        "accountId": "...",
        "status": "CLOSED/ACTIVE"
    }
    ```
  - **Output**:
    ```json
    {
        "message": "Account status updated successfully",
        "account": {
            "_id": "...",
            "user": "...",
            "status": "CLOSED/ACTIVE/FROZEN",
            "currency": "INR",
            "createdAt": "2026-02-27T06:21:08.798Z",
            "updatedAt": "2026-02-27T06:35:25.027Z",
            "__v": 0
        }
    }
    ```

- **`POST /api/accounts/system-update-status`**
  - **Description**: Updates an account status to FROZEN, ACTIVE, CLOSED.
  - **Access**: Protected (Requires system user authentication via `authMiddleware.authSystemUserMiddleware`)
  - **Input**:
    ```json
    {
        "accountId": "...",
        "status": "CLOSED"
    }
    ```
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

- **`GET /api/transactions?accountId=xxx&page=1&limit=10`**
  - **Description**: Get all financial transactions.
  - **Access**: Protected (`authMiddleware.authUserMiddleware`)
  - **Parameters**:
    - `accountId`: string (Query parameter) - The ID of the account.
    - `page`: number (Query parameter) - The page number for pagination.
    - `limit`: number (Query parameter) - The number of entries per page.
  - **Output**:
    ```json
    {
        "accountId": "...id",
        "transactions": [
            {
                "amount": 2000,
                "transaction": {
                    "_id": "...id",
                    "fromAccount": "...id",
                    "toAccount": "...id",
                    "type": "TRANSFER/DEPOSITE/REFUND/FAILED",
                    "status": "COMPLETED"
                },
                "type": "DEBIT",
                "createdAt": "2026-03-04T12:09:48.835Z"
            }
        ],
        "pagination": {
            "currentPage": 1,
            "totalPages": 2,
            "totalEntries": 18,
            "limit": 10
        }
    }
    ```

- **`POST /api/transactions/get-bonus`**
  - **Description**: Adds a bonus amount to the user account to perform demo, dont need system user to add intial-fund.
  - **Access**: Protected (Can only add bonus to users own ACTIVE account via `authMiddleware.authUserMiddleware`)
  - **Input**
    ```json
      {
        "toAccount": "...id",
        "idempotencyKey": "019cb929-d964-7918-bae9-f867d1de01c0"
      }
  
    ```
  - **Output**:
    ```json
      {
          "message": "Bonus added successfully",
          "transaction": {
              "_id": "...id",
              "fromAccount": "...id",
              "toAccount": "...id",
              "type": "BONUS",
              "status": "COMPLETED",
              "amount": 1000,
              "idempotencyKey": "bonus-019cb929-d964-7918-bae9-f867d1de01c0",
              "createdAt": "2026-03-04T14:04:21.795Z",
              "updatedAt": "2026-03-04T14:04:21.895Z",
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
            "type": "DEPOSITE",
            "status": "COMPLETED",
            "amount": 500,
            "idempotencyKey": "019c619c-5920-7d06-a45j-3cc50a3b905a",
            "createdAt": "2026-02-27T06:45:02.412Z",
            "updatedAt": "2026-02-27T06:45:02.536Z",
            "__v": 0
        }
    }
    ```


