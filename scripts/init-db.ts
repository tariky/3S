import mysql from "mysql2/promise";

async function setup() {
  // Connect to the server WITHOUT specifying the database name
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST!,
    user: process.env.MYSQL_USERNAME!,
    password: process.env.MYSQL_PASSWORD!,
  });

  console.log("Checking if database exists...");
  await connection.query(`CREATE DATABASE IF NOT EXISTS lunatikdrizzle;`);

  console.log("Database 'lunatikdrizzle' is ready!");
  await connection.end();
}

setup().catch(console.error);
