<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

test('admin table exists with expected columns', function () {
    expect(Schema::hasTable('admin'))->toBeTrue();
    expect(Schema::hasTable('address'))->toBeTrue();

    expect(Schema::getColumnListing('admin'))->toEqualCanonicalizing([
        'admin_id',
        'add_id',
        'fname',
        'mname',
        'lname',
        'email',
        'pw',
        'contact_number',
        'is_deleted',
        'must_change_password',
        'avatar',
        'created_at',
        'updated_at',
    ]);
});

test('admin add_id foreign key accepts valid address reference', function () {
    $addId = DB::table('address')->insertGetId([], 'add_id');

    $adminId = DB::table('admin')->insertGetId([
        'add_id' => $addId,
        'fname' => 'Ada',
    ], 'admin_id');

    expect($adminId)->toBeInt()->toBeGreaterThan(0);
});
