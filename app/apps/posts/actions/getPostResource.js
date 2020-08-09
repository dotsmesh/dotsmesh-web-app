/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    return await library.getPostResource(args.propertyType, args.propertyID, args.postID, args.resourceID);
};