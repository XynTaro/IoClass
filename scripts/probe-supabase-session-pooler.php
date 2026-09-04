#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Finds which shared Supavisor session pooler accepts postgres.<project_ref>.
 * Run from project root: php scripts/probe-supabase-session-pooler.php
 *
 * Uses VITE_SUPABASE_URL (or SUPABASE_PROJECT_REF) and DB_PASSWORD from .env.
 */

use Dotenv\Dotenv;

$root = dirname(__DIR__);

require $root.'/vendor/autoload.php';

Dotenv::createImmutable($root)->load();

$viteUrl = getenv('VITE_SUPABASE_URL') ?: ($_ENV['VITE_SUPABASE_URL'] ?? '');
$ref = getenv('SUPABASE_PROJECT_REF') ?: ($_ENV['SUPABASE_PROJECT_REF'] ?? '');

if ($ref === '' && $viteUrl !== '' && preg_match('#https?://([a-z0-9-]+)\.supabase\.co#i', $viteUrl, $m)) {
    $ref = $m[1];
}

$dbUser = getenv('DB_USERNAME') ?: ($_ENV['DB_USERNAME'] ?? '');
if ($ref === '' && str_starts_with($dbUser, 'postgres.')) {
    $ref = substr($dbUser, strlen('postgres.'));
}

$password = getenv('DB_PASSWORD') ?: ($_ENV['DB_PASSWORD'] ?? '');

if ($ref === '' || $password === '') {
    fwrite(STDERR, "Need DB_PASSWORD and either DB_USERNAME=postgres.<project_ref>, VITE_SUPABASE_URL, or SUPABASE_PROJECT_REF in .env.\n");

    exit(1);
}

$user = 'postgres.'.$ref;

$regions = [
    'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
    'ap-southeast-1', 'ap-southeast-2', 'ap-south-1', 'ap-east-1',
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-central-1', 'eu-north-1',
    'ca-central-1', 'sa-east-1', 'me-central-1', 'af-south-1',
];

foreach (['aws-0', 'aws-1'] as $prefix) {
    foreach ($regions as $region) {
        $host = "{$prefix}-{$region}.pooler.supabase.com";
        $dsn = "pgsql:host={$host};dbname='postgres';port=5432;client_encoding=utf8;sslmode=require";

        try {
            $pdo = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            $pdo->query('select 1')->fetchColumn();
            echo "Match found. Set in .env:\n";
            echo "DB_HOST={$host}\n";
            echo "DB_PORT=5432\n";
            echo "DB_USERNAME={$user}\n";

            exit(0);
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'password authentication failed')) {
                fwrite(STDERR, "Reached {$host} but database password was rejected. Reset DB password in Supabase → Settings → Database.\n");

                exit(2);
            }
            if (str_contains($msg, 'Tenant')
                || str_contains($msg, 'tenant')
                || str_contains($msg, 'ENOTFOUND')
                || str_contains($msg, 'could not translate host name')) {
                continue;
            }
            fwrite(STDERR, "{$host}: {$msg}\n");
        }
    }
}

fwrite(STDERR, "No pooler matched project ref {$ref}. In Supabase: Connect → Session pooler → copy Host and User into .env (host may not be aws-0-ap-northeast-1).\n");

exit(1);
