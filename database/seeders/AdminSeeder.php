<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdminSeeder extends Seeder
{
    /**
     * Seed the default administrator record for local / staging use.
     *
     * Default password: password (change immediately in production).
     */
    public function run(): void
    {
        $addId = DB::table('address')->value('add_id');

        Admin::query()->updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'add_id' => $addId,
                'fname' => 'System',
                'mname' => null,
                'lname' => 'Administrator',
                'pw' => 'password',
                'contact_number' => null,
                'is_deleted' => false,
            ],
        );
    }
}
