import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { startTestDatabase } from '../src/tests/test-database.js';
import { readEnvironment } from '../src/config/environment.js';
import { connectDatabase } from '../src/config/database.js';
import { createApp } from '../src/app.js';
import { Company } from '../src/modules/organization/company.model.js';
import { User } from '../src/modules/users/user.model.js';
const db=await startTestDatabase();
await connectDatabase(db.getUri());
const env={...readEnvironment(),NODE_ENV:'test' as const,MONGODB_URI:db.getUri(),COOKIE_SECURE:false,COOKIE_DOMAIN:undefined,COOKIE_SAME_SITE:'lax' as const,JWT_SECRET:randomBytes(48).toString('hex')};
const company=await Company.create({name:'AI Browser Fixture'});
await User.create({companyId:company._id,name:'AI Browser Employee',email:'employee@ai-browser.test',passwordHash:await bcrypt.hash('AI-Browser-Fixture-Only!',10),role:'employee',employeeCode:'FIXTURE',mustChangePassword:false});
const server=createApp(env).listen(5055,'127.0.0.1',()=>console.log('Isolated AI browser fixture ready on 5055.'));
async function stop(){server.close();await mongoose.disconnect();await db.stop();process.exit(0);}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
