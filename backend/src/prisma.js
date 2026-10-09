// One shared Prisma client for the whole app.
// Every controller imports this instead of creating its own connection.
//
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
