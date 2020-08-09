/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Change your password');


    var fieldOldPassword = x.makeFieldTextbox('Old password', { maxLength: 100, type: 'password' });
    x.add(fieldOldPassword);

    var fieldNewPassword = x.makeFieldTextbox('New password', { maxLength: 100, type: 'password' });
    x.add(fieldNewPassword);

    var fieldNewRepeatPassword = x.makeFieldTextbox('Repeat new password', { maxLength: 100, type: 'password' });
    x.add(fieldNewRepeatPassword);

    x.add(x.makeButton('Save Changes', async () => {
        var oldPassword = fieldOldPassword.getValue();
        var newPassword = fieldNewPassword.getValue();
        var newPassword2 = fieldNewRepeatPassword.getValue();
        if (newPassword.length === 0) {
            x.alert('The password is required!');
            return;
        }
        if (newPassword.length < 6) {
            x.alert('The password must be atleast 6 characters long!');
            return;
        }
        if (newPassword !== newPassword2) {
            x.alert('Passwords does not match!');
            return;
        }

        x.showLoading();
        var result = await x.currentUser.setNewPassword(oldPassword, newPassword);
        if (result === 'ok') {
            x.alert('Password changed successfully!');
            await x.back();
        } else if (result === 'invalidAuth') {
            x.hideLoading();
            x.alert('The old password is not valid!');
        } else if (result === 'noChange') {
            x.hideLoading();
            x.alert('The old and the new passwords are the same!');
        } else {
            throw new Error(result);
        }
    }));

};