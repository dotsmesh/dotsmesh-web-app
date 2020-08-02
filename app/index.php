<?php

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

$getVersion = function () {
    if (DOTSMESH_WEB_APP_DEV_MODE) {
        $object = require __DIR__ . '/appjs-builder.php';
        $content = [];
        $content[] = $object::getJS();
        $content[] = file_get_contents(__DIR__ . '/assets/sw.js');
        return md5(json_encode($content));
    } else {
        return is_file(__DIR__ . '/version') ? file_get_contents(__DIR__ . '/version') : '';
    }
};

$app = new App();

$app->enableErrorHandler(['logErrors' => true, 'displayErrors' => DOTSMESH_WEB_APP_DEV_MODE]);

if (isset($_SERVER['HTTP_X_CLOUDFRONT_PROXY_DOMAIN'])) {
    $app->request->host = $_SERVER['HTTP_X_CLOUDFRONT_PROXY_DOMAIN'];
}

if ($app->request->query->exists('_heartbeat')) {
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Pragma: no-cache");
    echo time();
    exit;
}

if (substr($app->request->host, 0, 4) === 'www.') {
    $app->request->host = substr($app->request->host, 4);
    $app->send(new BearFramework\App\Response\PermanentRedirect($app->request->getURL()));
    exit;
}

$app->routes
    ->add('/', function (App\Request $request) use ($getVersion) {
        $isAppRequest = $request->query->exists('app');
        if ($isAppRequest && $request->query->exists('sw')) {
            if (DOTSMESH_WEB_APP_DEV_MODE) {
                $content = file_get_contents(__DIR__ . '/assets/sw.js');
                if (!$request->query->exists('raw')) {
                    $content = str_replace('?app&a', '?app&a&v=' . $getVersion(), $content);
                }
            } else {
                $content = file_get_contents(__DIR__ . '/assets/sw.min.js');
                $content = str_replace('?app&a', '?app&a&v=' . $getVersion(), $content);
            }
            $response = new App\Response($content);
            $response->headers->set($response->headers->make('Content-Type', 'application/javascript'));
            $response->headers->set($response->headers->make('Cache-Control', 'public, max-age=86400'));
        } elseif ($isAppRequest && $request->query->exists('a')) {
            if (DOTSMESH_WEB_APP_DEV_MODE) {
                $object = require __DIR__ . '/appjs-builder.php';
                $content = $object::getJS();
                if (!$request->query->exists('raw')) {
                    $content = str_replace('?app&sw', '?app&sw&v=' . $getVersion(), $content);
                }
            } else {
                $content = file_get_contents(__DIR__ . '/assets/app.min.js');
                $content = str_replace('?app&sw', '?app&sw&v=' . $getVersion(), $content);
            }
            $response = new App\Response($content);
            $response->headers->set($response->headers->make('Content-Type', 'application/javascript'));
            $response->headers->set($response->headers->make('Cache-Control', 'public, max-age=86400000'));
        } elseif ($isAppRequest && $request->query->exists('i192')) {
            $content = file_get_contents(__DIR__ . '/assets/i192.png');
            $response = new App\Response($content);
            $response->headers->set($response->headers->make('Content-Type', 'image/png'));
            $response->headers->set($response->headers->make('Cache-Control', 'public, max-age=86400000'));
        } elseif ($isAppRequest && $request->query->exists('h960')) {
            $content = file_get_contents(__DIR__ . '/assets/h960.jpg');
            $response = new App\Response($content);
            $response->headers->set($response->headers->make('Content-Type', 'image/jpeg'));
            $response->headers->set($response->headers->make('Cache-Control', 'public, max-age=86400000'));
        } elseif ($isAppRequest && $request->query->exists('m')) {
            $response = new App\Response\JSON(json_encode([
                "short_name" => "Dots Mesh",
                "name" => "Dots Mesh",
                "start_url" => "/",
                "background_color" => "#111",
                "display" => "standalone",
                "theme_color" => "#111",
                "icons" => [
                    [
                        "src" => "?app&i192&v=2",
                        "type" => "image/png",
                        "sizes" => "192x192"
                    ]
                ],
            ]));
            $response->headers->set($response->headers->make('Cache-Control', 'public, max-age=86400'));
        } else {
            $content = file_get_contents(__DIR__ . '/assets/home.html');
            $content = str_replace('src="?app&a"', 'src="?app&a&v=' . $getVersion() . '"', $content);
            $response = new App\Response\HTML($content);
            $response->headers->set($response->headers->make('Cache-Control', 'public, max-age=600'));
        }
        if ($response !== null) {
            $response->headers->set($response->headers->make('X-Robots-Tag', 'noindex,nofollow'));
            $response->headers->set($response->headers->make('Strict-Transport-Security', 'max-age=63072000; preload'));
            return $response;
        }
    });

$app->run();
