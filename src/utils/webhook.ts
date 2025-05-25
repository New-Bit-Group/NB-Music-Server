import { Router } from 'express';
import { Config } from "./interfaces";

class WebHookRouter {
    readonly router : Router = Router();

    constructor(config : Config) {
        this.router.post('/', async (req, res) => {
            if (config.webhook?.secret) {
                const Webhooks = require('@octokit/webhooks');
                const webhookContext = new Webhooks({
                    secret: config.webhook.secret,
                });

                if (!req.headers['x-hub-signature-256'] || !req.headers['x-github-event']) {
                    res.status(400).end();
                    return;
                }

                if (!(await webhookContext.verify(req.body, <string>req.headers['x-hub-signature-256']))) {
                    res.status(401).end();
                    return;
                }

                res.status(202).end();

                const event = req.headers['x-github-event'];
                console.log(event);
            } else {
                res.status(500).end();
            }
        });
    }
}

export default WebHookRouter;