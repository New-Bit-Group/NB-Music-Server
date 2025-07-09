import getConfig from "../utils/config-loader"
import { response } from "../utils";

class SpeedLimit {
    private static records : {
        [ip: string]: {
            visits : number;
            isLogin : boolean;
            isBan : boolean;
            banEndTime : number;
        }
    } = {};

    static initialize() {
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
        }, getConfig().speedLimit.banDuration * 1000);
    }

    static getMiddleware() {
        return async (req: any, res: any, next: any) => {
            if (!SpeedLimit.records[req.ip]) {
                SpeedLimit.records[req.ip] = {
                    visits: 0,
                    isLogin: false,
                    isBan: false,
                    banEndTime: 0
                };
            }

            if (SpeedLimit.records[req.ip].isBan) {
                res.status(403).send(response(null, '您触发了访问频率限制，请稍后再试', -8));
                return;
            }

            let limit: number;

            if (req.session) {
                if (req.session.isAdministrator) {
                    // 管理员不受速率限制
                    next();
                    return;
                }

                limit = getConfig().speedLimit.userMaxSpeed;
            } else {
                limit = getConfig().speedLimit.guestMaxSpeed;
            }

            SpeedLimit.records[req.ip].visits++;

            if (SpeedLimit.records[req.ip].visits > limit) {
                SpeedLimit.records[req.ip].isBan = true;
                SpeedLimit.records[req.ip].banEndTime = Math.floor(Date.now() / 1000) + getConfig().speedLimit.banDuration;

                res.status(403).send(response(null, '您触发了访问频率限制，请稍后再试', -8));
                return;
            } else {
                next();
            }
        };
    }
}

export default SpeedLimit;