# Dots Mesh Web App

This is the code for the UI of the platform. There is an officially hosted version on [dotsmesh.com](https://dotsmesh.com/), and you can also easily install it on your server.

## Take a look

Some screenshots from the big screen version of the app:

### Your public profile

![Bear Framework](https://dotsmesh.github.io/web-app-screen-1.jpg)

### A public post

![Bear Framework](https://dotsmesh.github.io/web-app-screen-2.jpg)

### A list of all the posts by the profiles you follow

![Bear Framework](https://dotsmesh.github.io/web-app-screen-3.jpg)

### A private group

![Bear Framework](https://dotsmesh.github.io/web-app-screen-4.jpg)

### Private messages

![Bear Framework](https://dotsmesh.github.io/web-app-screen-5.jpg)

Learn more about all the features at [about.dotsmesh.com](https://about.dotsmesh.com/app/)

Take a look at a live profile at [dotsmesh.com#ivo](https://dotsmesh.com#ivo)

## Try it yourself

Just found out about Dots Mesh? Do you know that you can join the platform with a **free private profile** that lives on your device? Get started at [dotsmesh.com](https://dotsmesh.com/).

## How to install

[The Dots Mesh installer](https://about.dotsmesh.com/self-host/) is the recommended way to create your own host and join the platform. It will guide you through all the requirements and will install everything needed. There is an auto-update option, so you'll always use the latest stable version of the software.

### Custom installation

#### Requirements
- A web server (Apache, NGINX, etc.)
- PHP 7.2+
- SSL/TLS certificate

#### Get the code

Youn can [download the latest release as a PHAR file](https://github.com/dotsmesh/dotsmesh-web-app/releases) and run the web app this way. Create the index.php with the following content:
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
