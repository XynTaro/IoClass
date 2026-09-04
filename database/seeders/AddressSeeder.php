<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AddressSeeder extends Seeder
{
    /**
     * Ensure at least one row exists in `address` so `admin.add_id` can reference it.
     */
    public function run(): void
    {
        if (DB::table('address')->exists()) {
            return;
        }

        DB::table('address')->insert([]);
    }
}
