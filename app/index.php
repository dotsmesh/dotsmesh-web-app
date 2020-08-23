<?php

/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

/**

User data structure
p/?/e/ - sessions/
p/?/a/ - auth/
p/?/x - property information
 ****p/i/ - private/inbox/
 ****p/n/ - private/notifications/
 ****p/o/ - private/observer/
 ****p/f/ - private/firewall/
 ****p/c/ - private/contacts/
 ****p/e/ - private/explore/
 ****p/g/ - private/groups/
 ****p/m/ - private/messages/
 ****p/p/ - private/profile/
 ****s/a/ - shared/posts/
 ****s/p/ - shared/profile/
 ****s/keys - public keys

Group data structure
p/?/f/ - firewall/
p/?/x - property information
 ****p/i/ - private/invitations/
 ****p/l/ - private/logs/
 ****p/p/ - private/profile/
 ****s/m/ - shared/members/
 ****s/a/ - shared/posts/
 ****s/p/ - shared/profile/
 ****s/l/ - shared/logs/

 */

use BearFramework\App;

require __DIR__ . '/../vendor/autoload.php';

if (!defined('DOTSMESH_WEB_APP_DEV_MODE')) {
    define('DOTSMESH_WEB_APP_DEV_MODE', false);
}

$app = new App();

$hasLogsDirs = defined('DOTSMESH_WEB_APP_LOGS_DIR');
$app->enableErrorHandler(['logErrors' => $hasLogsDirs, 'displayErrors' => DOTSMESH_WEB_APP_DEV_MODE]);

if ($hasLogsDirs) {
    $app->logs->useFileLogger(DOTSMESH_WEB_APP_LOGS_DIR);
}

$app->routes
    ->add('/', function (App\Request $request) use ($app) {
        $isAppRequest = $request->query->exists('app');
        if ($isAppRequest && $request->query->exists('sw')) {
            $content = file_get_contents(DOTSMESH_WEB_APP_DEV_MODE ? __DIR__ . '/assets/sw.js' : __DIR__ . '/assets/sw.min.js');
            $response = new App\Response($content);
            $response->headers->set($response->headers->make('Content-Type', 'application/javascript'));
            $response->headers->set($response->headers->make('Cache-Control', DOTSMESH_WEB_APP_DEV_MODE ? 'no-store, no-cache, must-revalidate, max-age=0' : 'public, max-age=600'));
            $response->headers->set($response->headers->make('X-Robots-Tag', 'noindex,nofollow'));
        } elseif ($isAppRequest && $request->query->exists('a')) {
            if (DOTSMESH_WEB_APP_DEV_MODE) {
                $object = require __DIR__ . '/appjs-builder.php';
                $content = $object::getJS();
            } else {
                $isDebugEnabled = $request->query->exists('debug');
                $content = file_get_contents(__DIR__ . '/assets/' . ($isDebugEnabled ? 'app.js' : 'app.min.js'));
            }
            $response = new App\Response($content);
            $response->headers->set($response->headers->make('Content-Type', 'application/javascript'));
            $response->headers->set($response->headers->make('Cache-Control', DOTSMESH_WEB_APP_DEV_MODE ? 'no-store, no-cache, must-revalidate, max-age=0' : 'public, max-age=600'));
            $response->headers->set($response->headers->make('X-Robots-Tag', 'noindex,nofollow'));
        } elseif ($isAppRequest && $request->query->exists('h960')) {
            $content = file_get_contents(__DIR__ . '/assets/h960.jpg');
            $response = new App\Response($content);
            $response->headers->set($response->headers->make('Content-Type', 'image/jpeg'));
            $response->headers->set($response->headers->make('Cache-Control', DOTSMESH_WEB_APP_DEV_MODE ? 'no-store, no-cache, must-revalidate, max-age=0' : 'public, max-age=600'));
            $response->headers->set($response->headers->make('X-Robots-Tag', 'noindex,nofollow'));
        } elseif ($isAppRequest && $request->query->exists('m')) {
            $name = $app->request->host;
            if ($name === 'dotsmesh.com') {
                $name = '';
            } elseif ($name === 'dev.dotsmesh.com') {
                $name = 'dev';
            } elseif ($name === 'beta.dotsmesh.com') {
                $name = 'beta';
            } elseif (substr($name, 0, 9) === 'dotsmesh.') {
                $name = substr($name, 9);
            }
            $name = 'Dots Mesh' . (strlen($name) > 0 ? ' (' . $name . ')' : '');
            $response = new App\Response\JSON(json_encode([
                "short_name" => $name,
                "name" => $name,
                "start_url" => "/",
                "background_color" => "#111",
                "display" => "standalone",
                "theme_color" => "#111",
                "icons" => [
                    [
                        "src" => "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3e%3ccircle cy='256' cx='256' r='256' fill='%2324a4f2' paint-order='stroke markers fill'/%3e%3cpath d='M150.7 201.4c-28.08 0-50.7-22.62-50.7-50.7s22.62-50.7 50.7-50.7 50.7 22.62 50.7 50.7-22.62 50.7-50.7 50.7zM114.04 256c0 14.6016 12.0627 27.3 27.3 27.3s27.3-12.0627 27.3-27.3-12.6984-27.3-27.93492-27.3S114.04 240.7627 114.04 256zM256 330.1c-41.0397 0-74.1-33.0603-74.1-74.1s33.0603-74.1 74.1-74.1 74.1 33.0603 74.1 74.1-33.0603 74.1-74.1 74.1zM150.7 412c-28.08 0-50.7-22.62-50.7-50.7s22.62-50.7 50.7-50.7 50.7 22.62 50.7 50.7-22.62 50.7-50.7 50.7zm210.6 0c-28.08 0-50.7-22.62-50.7-50.7s22.62-50.7 50.7-50.7 50.7 22.62 50.7 50.7-22.62 50.7-50.7 50.7zm0-210.6c-28.08 0-50.7-22.62-50.7-50.7s22.62-50.7 50.7-50.7 50.7 22.62 50.7 50.7-22.62 50.7-50.7 50.7zM228.7 370.66c0 14.60162 12.0627 27.3 27.3 27.3s27.3-12.0627 27.3-27.3-12.6984-27.3-27.93492-27.3S228.7 355.4227 228.7 370.66zM343.36 256c0 14.6016 12.0627 27.3 27.3 27.3s27.3-12.0627 27.3-27.3-12.69838-27.3-27.93492-27.3S343.36 240.7627 343.36 256zM228.7 141.34c0 14.6016 12.0627 27.3 27.3 27.3s27.3-12.0627 27.3-27.3-12.6984-27.3-27.93492-27.3S228.7 126.1027 228.7 141.34z' fill='%23fff'/%3e%3c/svg%3e",
                        "type" => "image/svg+xml",
                        "sizes" => "512x512"
                    ]
                ],
            ]));
            $response->headers->set($response->headers->make('Cache-Control', DOTSMESH_WEB_APP_DEV_MODE ? 'no-store, no-cache, must-revalidate, max-age=0' : 'public, max-age=600'));
        } else {
            $isDebugEnabled = $request->query->exists('debug');
            $content = file_get_contents(__DIR__ . '/assets/home.html');
            if ($isDebugEnabled) {
                $content = str_replace('src="?app&a"', 'src="?app&a&debug"', $content);
            }
            $response = new App\Response\HTML($content);
            $response->headers->set($response->headers->make('Cache-Control', DOTSMESH_WEB_APP_DEV_MODE ? 'no-store, no-cache, must-revalidate, max-age=0' : 'public, max-age=600'));
            $response->headers->set($response->headers->make('X-Robots-Tag', $app->request->host === 'dotsmesh.com' ? 'nofollow' : 'noindex,nofollow'));
        }
        if ($response !== null) {
            $response->headers->set($response->headers->make('Strict-Transport-Security', 'max-age=63072000; preload'));
            return $response;
        }
    });

$app->run();
