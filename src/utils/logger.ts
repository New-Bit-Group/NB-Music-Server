class Logger {
    private static dateFormat : Object = {
        hour12: false
    };

    static info(message: string) {
        console.info("[" + new Date().toLocaleString(undefined, this.dateFormat) + "][INFO] " + message);
    }

    static notice(message: string) {
        console.log("\x1B[32m[" + new Date().toLocaleString(undefined, this.dateFormat) + "][NOTICE] " + message + "\x1B[0m");
    }

    static error(message: string) {
        console.error("\x1B[31m[" + new Date().toLocaleString(undefined, this.dateFormat) + "][ERROR] " + message + "\x1B[0m");
    }

    static warning(message: string) {
        console.warn("\x1B[33m[" + new Date().toLocaleString(undefined, this.dateFormat) + "][WARNING] " + message + "\x1B[0m");
    }

    static debug(message: string) {
        console.info("\x1B[34m[" + new Date().toLocaleString(undefined, this.dateFormat) + "][DEBUG] " + message + "\x1B[0m");
    }
}

export default Logger;