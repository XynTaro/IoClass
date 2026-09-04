<?php

namespace Database\Factories;

use App\Models\AuditTrail;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditTrail>
 */
class AuditTrailFactory extends Factory
{
    protected $model = AuditTrail::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'actor_type' => fake()->randomElement(['teacher', 'admin']),
            'actor_id' => null,
            'actor_name' => fake()->name(),
            'action' => fake()->randomElement(['login', 'logout', 'sf2.export', 'attendance.verify']),
            'description' => fake()->sentence(),
            'properties' => null,
            'created_at' => now(),
        ];
    }
}
