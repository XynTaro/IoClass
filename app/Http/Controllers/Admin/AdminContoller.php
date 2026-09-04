<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

/**
 * Base controller for all admin-panel controllers.
 *
 * Applies the `auth:admin` middleware so every child controller
 * automatically requires an authenticated admin session.
 */
class AdminController extends Controller
{
    public function __construct()
    {
        // Ensure every admin route requires an authenticated admin guard.
        $this->middleware('auth:admin');
    }
}
