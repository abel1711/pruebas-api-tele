const input = require('input');
const api = require("./api");
require('dotenv').config()

const customInput = async ( message )=>{
    return await  input.text(message);
}


const init = async () => {


    const user = await api.getUser();
    
    
    if (!user) {
        
        const phone = await customInput('Please, what is your phone number?' );
        
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

            const password = await customInput('Please, what is your password?' );

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

            const checkPasswordResult = await api.checkPassword({ srp_id, A, M1 });
        }
    }
    console.clear();
    console.log('Telegram initilized...')
};


init().then( resp => {
})


