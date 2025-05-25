import { Config } from "./interfaces";
import Storage from "./storage";
import { responseFormat, getUserID, isAdmin } from "./index";

class SpeedLimit {
    private static records : {
        [ip: string]: {
            visits : number;
            isLogin : boolean;
            isBan : boolean;
            banEndTime : number;
        }
    } = {};

    private static config : Config;

    static init(config: Config) {
        SpeedLimit.config = config;

        setInterval(() => {
            Object.keys(SpeedLimit.records).forEach(ip => {
                // 如果访客没有被ban，就重置他的访问次数
                if (!SpeedLimit.records[ip].isBan) {
                    delete SpeedLimit.records[ip];
                }
            });
        }, 60 * 1000);

        setInterval(() => {
            Object.keys(SpeedLimit.records).forEach(ip => {
                if (SpeedLimit.records[ip].isBan && SpeedLimit.records[ip].banEndTime < Math.floor(Date.now() / 1000)) {
                    delete SpeedLimit.records[ip];
                }
            });
        }, config.speedLimit.banDuration * 1000);
    }

    static async middleware(req : any, res : any, next : any) {
        if (!SpeedLimit.records[req.ip]) {
            SpeedLimit.records[req.ip] = {
                visits: 0,
                isLogin: false,
                isBan: false,
                banEndTime: 0
            };
        }

        if (SpeedLimit.records[req.ip].isBan) {
            res.status(403).send(responseFormat(null, '您触发了访问频率限制，请稍后再试', -8));
            return;
        }

        let isLogin = false;
        let limit : number;
        const sessionId = req.headers.authorization?.split(' ')[1];

        if (sessionId) {
            isLogin =
                await Storage
                    .getCacheDatabaseAction()
                    .table('nb_music_session')
                    .name(sessionId)
                    .exist()
        }

        if (isLogin) {
            const user = await getUserID(req, res);
            if (user && isAdmin(user.userId, SpeedLimit.config)) {
                // 管理员不受速率限制
                next();
                return;
            }

            limit = SpeedLimit.config.speedLimit.userMaxSpeed;
        } else {
            limit = SpeedLimit.config.speedLimit.guestMaxSpeed;
        }

        SpeedLimit.records[req.ip].visits++;

        if (SpeedLimit.records[req.ip].visits > limit) {
            SpeedLimit.records[req.ip].isBan = true;
            SpeedLimit.records[req.ip].banEndTime = Math.floor(Date.now() / 1000) + SpeedLimit.config.speedLimit.banDuration;

            res.status(403).send(responseFormat(null, '您触发了访问频率限制，请稍后再试', -8));
            return;
        } else {
            next();
        }
    }
}

export default SpeedLimit;