<?php

namespace Database\Factories;

use App\Models\Admin;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Admin>
 */
class AdminFactory extends Factory
{
    protected $model = Admin::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'add_id' => null,
            'fname' => fake()->firstName(),
            'mname' => null,
            'lname' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'pw' => 'password',
            'contact_number' => null,
            'is_deleted' => false,
            'must_change_password' => false,
        ];
    }
}
