const path = require('path');
const MTProto = require('@mtproto/core');
const { sleep } = require('@mtproto/core/src/utils/common');
const { cargarDataBase, leerDataBase, leerDataBaseMensajes, cargarDataBaseMensajes } = require('./helpers/dbInteractions');
require('dotenv').config();
require('colors');

class API {
    constructor() {
        this.mtproto = new MTProto({
            api_id: process.env.API_ID,
            api_hash: process.env.API_HASH,

            storageOptions: {
                path: path.resolve(__dirname, './data/1.json'),
            },
        });
        this.data = [];
        this.messageToReply = '';
        this.messages = [];
        this.idMsjToReply = 0;
        this.subscribeToUpdates();
        this.cargarDb();
    }

    cargarDb() {
        const data = leerDataBase();
        if (data) {
            this.data = [...data];
        }
        const msjs = leerDataBaseMensajes();
        if (msjs) {
            this.messages = [...msjs]
        }
    }

    async call(method, params, options = {}) {
        try {
            const result = await this.mtproto.call(method, params, options);

            return result;
        } catch (error) {
            console.log(`${method} error:`.red, error);

            const { error_code, error_message } = error;

            if (error_code === 420) {
                const seconds = Number(error_message.split('FLOOD_WAIT_')[1]);
                const ms = seconds * 1000;

                await sleep(ms);

                return this.call(method, params, options);
            }

            if (error_code === 303) {
                const [type, dcIdAsString] = error_message.split('_MIGRATE_');

                const dcId = Number(dcIdAsString);

                // If auth.sendCode call on incorrect DC need change default DC, because
                // call auth.signIn on incorrect DC return PHONE_CODE_EXPIRED error
                if (type === 'PHONE') {
                    await this.mtproto.setDefaultDc(dcId);
                } else {
                    Object.assign(options, { dcId });
                }

                return this.call(method, params, options);
            }

            return Promise.reject(error);
        }
    }

    async getUser() {
        try {
            const user = await this.call('users.getFullUser', {
                id: {
                    _: 'inputUserSelf',
                },
            });

            return user;
        } catch (error) {
            return null;
        }
    }

    sendCode(phone) {
        return this.call('auth.sendCode', {
            phone_number: phone,
            settings: {
                _: 'codeSettings',
            },
        });
    }

    signIn({ code, phone, phone_code_hash }) {
        return this.call('auth.signIn', {
            phone_code: code,
            phone_number: phone,
            phone_code_hash: phone_code_hash,
        });
    }

    signUp({ phone, phone_code_hash }) {
        return this.call('auth.signUp', {
            phone_number: phone,
            phone_code_hash: phone_code_hash,
            first_name: 'MTProto',
            last_name: 'Core',
        });
    }

    getPassword() {
        return this.call('account.getPassword');
    }

    checkPassword({ srp_id, A, M1 }) {
        return this.call('auth.checkPassword', {
            password: {
                _: 'inputCheckPasswordSRP',
                srp_id,
                A,
                M1,
            },
        });
    }

    async getHistory(username) {

        console.log('Fetch history messages of: ', username);

        const resolveGroup = await this.call('contacts.resolveUsername', {
            username: username.replace('@', ''),
        });

        const hash = resolveGroup.chats[0].access_hash;
        const id = resolveGroup.chats[0].id;

        try {

            const { messages } = await this.call('messages.getHistory', {
                peer: {
                    _: 'inputPeerChannel',
                    channel_id: '1444010365',
                    access_hash: '16085455229367788317',
                },
                max_id: 0,
                offset: 0,
                limit: 20,
            });

        } catch (error) {

        }

    }

    async ObternerIdMsjToReply(idMsjCopiado) {

        const msj = this.messages.find((message) => message.id === idMsjCopiado && message.channel_id == process.env.C_CHANNEL_ID);

        if (msj) {
            try {

                const MsjInMyChannel = await this.call('messages.getHistory', {
                    peer: {
                        _: 'inputPeerChannel',
                        channel_id: process.env.R_CHANNEL_ID,
                        access_hash: process.env.R_CHANNEL_HASH,
                    },
                    max_id: 0,
                    offset: 0,
                    limit: 50,
                });

                const msj2 = MsjInMyChannel.messages.find(
                    (mensaje) => mensaje.message == msj.message
                );
                if (msj2) {
                    this.idMsjToReply = msj2.id;
                }
            } catch (error) {
                console.log('error2: '.red, error)
            }
        }
    }

    async subscribeToUpdates() {

        this.mtproto.updates.on('updates', (updateInfo) => {



            updateInfo.updates.forEach(async (update) => {

                if (update._ == 'updateNewChannelMessage') {

                    try {
                        const channel = {
                            canal: updateInfo.chats[0].title,
                            idCanal: updateInfo.chats[0].id,
                            hashCanal: updateInfo.chats[0].access_hash,
                        };

                        const existe = this.data.some(
                            (data) => data.idCanal === channel.idCanal
                        );

                        if (!existe) {
                            this.data.push(channel);
                            cargarDataBase(this.data);
                            this.cargarDb();
                        }

                    } catch (error) {
                        console.log('fs:', error);
                    }
                }

                if (
                    update._ == 'updateNewChannelMessage' &&
                    update.message.peer_id.channel_id ==
                    process.env.C_CHANNEL_ID
                ) {

                    const newMsj = {
                        message: update.message.message,
                        id: update.message.id,
                        channel_id: update.message.peer_id.channel_id
                    }

                    this.messages.push(newMsj);

                    if (this.messages.length == 51) {
                        this.messages.shift();
                    }

                    cargarDataBaseMensajes(this.messages);

                    this.cargarDb();

                    console.log(`Nuevo mensaje:`.red.bgBlack);
                    console.log(
                        `${update.message.message}`.bgBlack.brightGreen
                    );

                    if (update.message.reply_to) {
                        await this.ObternerIdMsjToReply(
                            update.message.reply_to.reply_to_msg_id
                        );
                    }
                    this.messageToReply = update.message.message;
                    this.sendMessageToChannel();
                }
            });
        });
    }

    async sendMessageToChannel() {
        try {
            await this.call('messages.sendMessage', {
                peer: {
                    _: 'inputPeerChannel',
                    channel_id: process.env.R_CHANNEL_ID,
                    access_hash: process.env.R_CHANNEL_HASH, // hash del canal de pruebas
                },
                random_id:
                    Math.ceil(Math.random() * 0xffffff) +
                    Math.ceil(Math.random() * 0xffffff),
                message: this.messageToReply,
                reply_to_msg_id: this.idMsjToReply,
            });

            this.messagesToReply = '';
            this.idMsjToReply = 0;
        } catch (error) {
            console.log('error on sendMessageToChannel'.red, error);
        }
    }
}

const api = new API();

module.exports = api;
