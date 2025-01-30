# Email Queue Simulation

This project is a **NestJS-based email queue processing system** that supports:
- **Local development:** Uses **PostgreSQL** as the database and **Kafka** for messaging.
- **Production:** Uses **AWS DynamoDB** for storage and **AWS SQS** for queue processing.

---

## **🔹 Prerequisites**
Before running the application, make sure you have:
- **Docker & Docker Compose** installed ([Install Docker](https://docs.docker.com/get-docker/))
- **AWS account** (for production mode)
- **AWS IAM credentials** (for DynamoDB & SQS in production mode)
- **Node.js 18+ and Yarn** installed ([Install Node.js](https://nodejs.org/en/download/))

---

## **🚀 Running the App**

### **1️⃣ Running in Local Mode (PostgreSQL + Kafka)**

#### **Step 1: Set Up Environment Variables**
Create a **`.env.local`** file in the backend directory:
```env
NODE_ENV=development
QUEUE_TYPE=kafka
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASS=password
DB_NAME=fena_task
KAFKA_BROKER=kafka:9092
```

#### **Step 2: Start the Application with Docker**
Run the following command to start the app:
```sh
docker compose --env-file ./backend/.env.local up --build
```
This will start:
- **PostgreSQL** (port **5432**)
- **Kafka** (port **9092**)
- **Backend service** (port **3000**)
- **Frontend service** (port **80**)

#### **Step 3: Access the API**
- API is available at: [`http://localhost:3000`](http://localhost:3000)
- Check logs: `docker compose logs -f backend`

#### **Step 4: Stop the Application**
To stop and remove the containers:
```sh
docker compose down
```

---

### **2️⃣ Running in Production Mode (AWS DynamoDB + SQS)**

#### **Step 1: Set Up Environment Variables**
Create a **`.env.production`** file in the backend directory:
```env
NODE_ENV=production
QUEUE_TYPE=sqs
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SQS_URL=https://sqs.us-east-1.amazonaws.com/your-account-id/your-queue-name
```

#### **Step 2: Create AWS DynamoDB Table**
Run the following AWS CLI command to create the **Jobs** table:
```sh
aws dynamodb create-table \
    --table-name Jobs \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

#### **Step 3: Start the Application in Production Mode**
Run the following command to start the app in production mode:
```sh
docker compose --env-file ./backend/.env.production up --build
```

#### **Step 4: Access the API**
- API is available at your **production URL**
- Check logs: `docker compose logs -f backend`

#### **Step 5: Stop the Application**
To stop the production containers:
```sh
docker compose down
```

---

## **🛠 Useful Commands**

### **Running the Backend Without Docker (Local Development Only)**
```sh
cd backend
yarn install
yarn start:dev
```

### **Running Database Migrations (PostgreSQL)**
```sh
yarn typeorm migration:run
```

### **Checking Docker Logs**
```sh
docker compose logs -f backend
```

---

## **📜 API Documentation**
- **Base URL (Local):** [`http://localhost:3000`](http://localhost:3000)
- **Base URL (Production):** Your live API URL
- **Available Endpoints:**
  - `POST /jobs` → Create a new job
  - `GET /jobs/:id` → Fetch job details
  - `GET /jobs` → Get all jobs
  - `PATCH /jobs/:id` → Update job progress
  - `DELETE /jobs/:id` → Delete a job

---

## **🎯 Troubleshooting**

### **1️⃣ PostgreSQL Connection Issues**
If you see this error:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
Run:
```sh
docker compose down && docker compose up --build
```

### **2️⃣ DynamoDB Issues in Production**
If you see this error:
```
DynamoDB: Cannot connect to AWS DynamoDB
```
- Make sure your **AWS credentials** are correctly set in `.env.production`
- Check if the **DynamoDB table exists** using:
```sh
aws dynamodb list-tables --region us-east-1
```

### **3️⃣ Kafka Issues in Local Development**
If Kafka isn't working, restart the services:
```sh
docker compose restart kafka
```

---

## **📌 Notes**
- **Only one environment should be active at a time** (`.env.local` OR `.env.production`).
- **Make sure you have AWS permissions for SQS & DynamoDB** before running in production.

---

## **👨‍💻 Author**
**Hamza Halilovic**

---

## **📜 License**
This project is licensed under the **MIT License**.

