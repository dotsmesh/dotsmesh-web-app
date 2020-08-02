<?php

return new class
{
    static function getJS()
    {

        $appsDir = __DIR__ . '/apps';
        $apps = [];
        $apps['user'] = $appsDir . '/user';
        $apps['home'] = $appsDir . '/home';
        $apps['explore'] = $appsDir . '/explore';
        $apps['contacts'] = $appsDir . '/contacts';
        $apps['messages'] = $appsDir . '/messages';
        $apps['posts'] = $appsDir . '/posts';
        $apps['groups'] = $appsDir . '/groups';
        $apps['group'] = $appsDir . '/group';
        $apps['profile'] = $appsDir . '/profile';
        $apps['settings'] = $appsDir . '/settings';
        $apps['system'] = $appsDir . '/system';

        $getJSFunction  = function ($filename) {
            $content = file_get_contents($filename);
            return trim(trim($content), ';');
        };

        $getAppJS = function (string $dir) use ($getJSFunction): string {
            $content = file_get_contents($dir . '/manifest.json');
            $manifest =  json_decode($content, true);
            $js = '{';
            $js .= 'name:' . json_encode($manifest['name']) . ',';

            $js .= 'views:{';
            if (isset($manifest['views'])) {
                foreach ($manifest['views'] as $viewID) {
                    $js .= $viewID . ':' . $getJSFunction($dir . '/views/' . $viewID . '.js') . ',';
                }
            }
            $js = rtrim($js, ',');
            $js .= '},';

            $js .= 'actions:{';
            if (isset($manifest['actions'])) {
                foreach ($manifest['actions'] as $action) {
                    $js .= $action . ':' . $getJSFunction($dir . '/actions/' . $action . '.js') . ',';
                }
            }
            $js = rtrim($js, ',');
            $js .= '},';

            if (isset($manifest['inbox']) && (int) $manifest['inbox'] > 0) {
                $js .= 'inbox:' . $getJSFunction($dir . '/inbox.js') . ',';
            }
            if (isset($manifest['propertyObserver']) && (int) $manifest['propertyObserver'] > 0) {
                $js .= 'propertyObserver:' . $getJSFunction($dir . '/propertyObserver.js') . ',';
            }
            if (isset($manifest['library']) && (int) $manifest['library'] > 0) {
                $js .= 'library:' . $getJSFunction($dir . '/library.js') . ',';
            }
            $js = rtrim($js, ',');
            $js .= '}';
            return $js;
        };

        $sourceCode = '{';
        $sourceCode .= 'core:' . $getJSFunction(__DIR__ . '/library/core.js') . ',';
        $sourceCode .= 'app:' . $getJSFunction(__DIR__ . '/library/app.js') . ',';
        $sourceCode .= 'sandboxProxy:' . $getJSFunction(__DIR__ . '/library/sandboxProxy.js') . ',';
        $sourceCode .= 'sandboxWindow:' . $getJSFunction(__DIR__ . '/library/sandboxWindow.js') . ',';
        $sourceCode .= 'sandboxWorker:' . $getJSFunction(__DIR__ . '/library/sandboxWorker.js') . ',';
        $sourceCode .= 'utilities:' . $getJSFunction(__DIR__ . '/library/utilities.js') . ',';
        $sourceCode .= 'apps:{';
        foreach ($apps as $appID => $appDir) {
            $sourceCode .= '"' . $appID . '":' . $getAppJS($appDir) . ',';
        }
        $sourceCode = rtrim($sourceCode, ',');
        $sourceCode .= '}';
        $sourceCode .= '}';
        $js = 'self.x=typeof self.x==="undefined"?{}:self.x;(' . $getJSFunction(__DIR__ . '/library/library.js') . ')(self.x,' . $sourceCode . ');';
        return $js;
    }
};
