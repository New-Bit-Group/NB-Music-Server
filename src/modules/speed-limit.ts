import config from "../config"
import { responseFormat } from "../utils";
import { getUser, isAdmin } from '../utils/auth';

class SpeedLimit {
    private static records : {
        [ip: string]: {
            visits : number;
            isLogin : boolean;
            isBan : boolean;
            banEndTime : number;
        }
    } = {};

    static {
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

        let user;
        let limit : number;
        const sessionId = req.headers.authorization?.split(' ')[1];

        if (sessionId) {
            user = await getUser(req, res, true);
        }

        if (user) {
            if (isAdmin(user.userId, config)) {
                // 管理员不受速率限制
                next();
                return;
            }

            limit = config.speedLimit.userMaxSpeed;
        } else {
            limit = config.speedLimit.guestMaxSpeed;
        }

        SpeedLimit.records[req.ip].visits++;

        if (SpeedLimit.records[req.ip].visits > limit) {
            SpeedLimit.records[req.ip].isBan = true;
            SpeedLimit.records[req.ip].banEndTime = Math.floor(Date.now() / 1000) + config.speedLimit.banDuration;

            res.status(403).send(responseFormat(null, '您触发了访问频率限制，请稍后再试', -8));
            return;
        } else {
            next();
        }
    }
}

export default SpeedLimit;