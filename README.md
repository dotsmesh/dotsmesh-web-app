# Dots Mesh Web App

This is the code for the UI of the platform. There is an officially hosted version on [dotsmesh.com](https://dotsmesh.com/), and you can also easily install it on your server.

## What is Dots Mesh?
Dots Mesh is a different kind of social platform. It's open and distributed by design. You can self-host your public social profile the same way you can self-host your website and email. There are private profiles, secret groups, private messaging, and [more](https://about.dotsmesh.com/).

## Take a look

Some screenshots from the big screen version of the app:

### Your public profile

![The Dots Mesh web app](https://dotsmesh.github.io/web-app-screen-1.jpg)

### A public post

![The Dots Mesh web app](https://dotsmesh.github.io/web-app-screen-2.jpg)

### A list of all the posts by the profiles you follow

![The Dots Mesh web app](https://dotsmesh.github.io/web-app-screen-3.jpg)

### A private group

![The Dots Mesh web app](https://dotsmesh.github.io/web-app-screen-4.jpg)

### Private messages

![The Dots Mesh web app](https://dotsmesh.github.io/web-app-screen-5.jpg)

Learn more about all the features at [about.dotsmesh.com/app](https://about.dotsmesh.com/app/)

Take a look at a live profile at [dotsmesh.com#ivo](https://dotsmesh.com#ivo)

## Try it yourself

Just found out about Dots Mesh? Do you know that you can join the platform with a **free private profile** that lives on your device? Get started at [dotsmesh.com](https://dotsmesh.com/).

## How to install

[The Dots Mesh installer](https://about.dotsmesh.com/self-host/) is the recommended way to create your own host and join the platform. It will guide you through all the requirements and will install everything needed. There is an auto-update option, so you'll always use the latest stable version of the software.

![The Dots Mesh Installer](https://dotsmesh.github.io/installer-screen-1.png)

### Custom installation

#### Requirements
- A web server (Apache, NGINX, etc.)
- PHP 7.2+
- SSL/TLS certificate

#### Get the code

You can [download the latest release as a PHAR file](https://github.com/dotsmesh/dotsmesh-web-app/releases) and run the web app this way. Create the index.php with the following content:
```php
<?php

require 'dotsmesh-web-app-x.x.x.phar';
```

There is a [ZIP file](https://github.com/dotsmesh/dotsmesh-web-app/releases) option too. Just extract the content to a directory and point the index.php file to it.
```php
<?php

require 'dotsmesh-web-app-x.x.x/app/index.php';
```

## License

The Dots Mesh Web App is licensed under the GPL v3 license. See the [license file](https://github.com/dotsmesh/dotsmesh-web-app/blob/master/LICENSE) for more information.

## Contributions

The Dots Mesh platform is a community effort. Feel free to join and help us build a truly open social platform for everyone.
