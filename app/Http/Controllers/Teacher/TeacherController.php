<?php

namespace App\Http\Controllers;

class TeacherController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:teacher');
    }
}
