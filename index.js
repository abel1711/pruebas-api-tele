const input = require('input');
const cliProgress = require('cli-progress');
require('dotenv').config();
const api = require('./api');

const TIME_TO_REFRESH = 600000;

// create a new progress bar instance and use shades_classic theme
// const bar1 = new cliProgress.SingleBar(
//     { clearOnComplete: true,
//         stopOnComplete: true,
//         format: 'progress [{bar}] {percentage}%'
//     },
//     cliProgress.Presets.shades_classic
// );

// let miliseconds = 0;
console.clear();
const customInput = async (message) => {
    return await input.text(message);
};

const init = async () => {
    const user = await api.getUser();
    // miliseconds = 0;
    if (!user) {
        const phone = await customInput('Please, what is your phone number?');

        const { phone_code_hash } = await api.sendCode(phone); // esta funcion dispara el envio del codigo

        const code = await customInput('Whats is de phone code?'); // hay que ver si funciona

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
    // console.clear();
    console.log(`Telegram initilized...(${new Date().toLocaleString()})`);
    // start the progress bar with a total value of 200 and start value of 0
    // bar1.start(TIME_TO_REFRESH, 0, {});

    // // update the current value in your application..
    // setInterval(() => {
    //     miliseconds += 100;
    //     bar1.increment();
    //     bar1.update(miliseconds);
    // }, 100);
};

init().then(()=>{
    
});
setInterval(() => {
    init();
}, TIME_TO_REFRESH);
