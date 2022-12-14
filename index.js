const input = require('input');

require('dotenv').config();
require('colors');

const api = require('./api');

console.clear();

const customInput = async (message) => {
    return await input.text(message);
};

let firstInit = true;

const init = async () => {

    const user = await api.getUser();

    if (!user) {
        const phone = process.env.PHONE;

        const { phone_code_hash } = await api.sendCode(phone); // esta funcion dispara el envio del codigo

        const code = await customInput('Whats is de phone code?');

        try {
            const signInResult = await api.signIn({
                code,
                phone,
                phone_code_hash,
            });

            if (signInResult._ === 'auth.authorizationSignUpRequired') {
                await api.signUp({
                    phone,
                    phone_code_hash,
                });
            }
        } catch (error) {
            if (error.error_message !== 'SESSION_PASSWORD_NEEDED') {
                console.log(`error:`, error);

                return;
            }

            // 2FA

            const password = await customInput(
                'Please, what is your password?'
            );

            const { srp_id, current_algo, srp_B } = await api.getPassword();
            const { g, p, salt1, salt2 } = current_algo;

            const { A, M1 } = await api.mtproto.crypto.getSRPParams({
                g,
                p,
                salt1,
                salt2,
                gB: srp_B,
                password,
            });

            const checkPasswordResult = await api.checkPassword({
                srp_id,
                A,
                M1,
            });
        }
    }
    if (firstInit) {
        console.log('\t╔════════════════════════════════════════╗'.brightGreen.bgBlack)
        console.log(`\t║  Copiador de mensajes inicializado...  ║`.bgBlack.brightGreen);
        console.log('\t╚════════════════════════════════════════╝'.brightGreen.bgBlack)
        firstInit = false;
    }
    console.log(`${new Date().toLocaleTimeString()}`)
};

init();
setInterval(() => {
    init();
}, 150000);