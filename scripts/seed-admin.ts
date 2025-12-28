/**
 * CLI script to seed the first super admin
 * Usage: npx ts-node scripts/seed-admin.ts
 */

import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SALT_ROUNDS = 10;

interface AdminData {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
}

async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function seedAdmin(adminData: AdminData) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('\n🔐 Creating super admin account...\n');

    // Check if email already exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminData.email)
        .single();

    if (existingUser) {
        console.error(`❌ User with email ${adminData.email} already exists`);
        process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminData.password, SALT_ROUNDS);

    // Create user
    const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
            email: adminData.email,
            password_hash: passwordHash,
            role: 'super_admin',
            status: 'active',
            email_verified: true,
            must_change_password: false,
        })
        .select()
        .single();

    if (userError) {
        console.error('❌ Failed to create user:', userError.message);
        process.exit(1);
    }

    // Create admin profile
    const { error: adminError } = await supabase
        .from('admins')
        .insert({
            user_id: user.id,
            full_name: adminData.fullName,
            phone: adminData.phone,
            is_super_admin: true,
            permissions: { all: true },
        });

    if (adminError) {
        // Rollback user creation
        await supabase.from('users').delete().eq('id', user.id);
        console.error('❌ Failed to create admin profile:', adminError.message);
        process.exit(1);
    }

    console.log('✅ Super admin created successfully!\n');
    console.log('📧 Email:', adminData.email);
    console.log('👤 Name:', adminData.fullName);
    console.log('🔑 Password: [as entered]\n');
    console.log('Use POST /api/v1/auth/login/admin to login.\n');
}

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('       MARHAS BACKEND - ADMIN SEEDER       ');
    console.log('═══════════════════════════════════════════\n');

    // Check for command line arguments
    const args = process.argv.slice(2);

    let adminData: AdminData;

    if (args.length >= 3) {
        // Non-interactive mode
        adminData = {
            email: args[0],
            password: args[1],
            fullName: args[2],
            phone: args[3],
        };
    } else {
        // Interactive mode
        console.log('Please enter the super admin details:\n');

        const email = await prompt('Email: ');
        if (!email || !email.includes('@')) {
            console.error('❌ Invalid email');
            process.exit(1);
        }

        const password = await prompt('Password (min 8 chars): ');
        if (!password || password.length < 8) {
            console.error('❌ Password must be at least 8 characters');
            process.exit(1);
        }

        const fullName = await prompt('Full Name: ');
        if (!fullName) {
            console.error('❌ Full name is required');
            process.exit(1);
        }

        const phone = await prompt('Phone (optional): ');

        adminData = { email, password, fullName, phone };
    }

    await seedAdmin(adminData);
}

main().catch(console.error);
