
import Hub from "./AlQurmaniHub.js";

const Secure = (() => {

    const wait = () => {
        return new Promise((resolve, reject) => {

            const state = Hub.state();

            if (state.ready && state.profile) {
                return resolve(state.profile);
            }

            if (state.compromised) {
                return reject("SECURITY_BREACH");
            }

            let done = false;

            const cleanup = () => {
                done = true;
                unsubReady?.();
                unsubBreach?.();
            };

            const unsubReady = Hub.onReady((s) => {
                if (done) return;
                cleanup();

                if (!s.profile) {
                    return reject("NO_PROFILE");
                }

                resolve(s.profile);
            });

            const unsubBreach = Hub.onBreach((type) => {
                if (done) return;
                cleanup();
                reject(type || "SECURITY_BREACH");
            });

            setTimeout(() => {
                if (done) return;
                cleanup();
                reject("TIMEOUT");
            }, 10000);

        });
    };

    const allow = (perm) => {
        const state = Hub.state();

        if (state.compromised) return false;
        if (!state.profile) return false;
        if (state.risk > 70) return false;

        return Hub.allow(perm);
    };

    const guard = async (perm) => {
        const user = await wait();

        if (!allow(perm)) {
            throw new Error("ACCESS_DENIED:" + perm);
        }

        return user;
    };

    const hardGuard = async (perm, action) => {
        try {
            const user = await guard(perm);
            return await action(user);
        } catch (e) {
            console.warn("🚫 BLOCKED:", e.message);
            throw e;
        }
    };

    const user = () => {
        if (Hub.state().compromised) return null;
        return Hub.getUser();
    };

    const isAdmin = () => {
        if (Hub.state().compromised) return false;
        return Hub.isAdmin();
    };

    const risk = () => Hub.risk();

    const onChange = (cb) => {
        return Hub.onReady((state) => {
            if (!state.compromised) cb(state);
        });
    };

    const onBreach = (cb) => Hub.onBreach(cb);

    const run = async (perm, fn) => {
        return hardGuard(perm, fn);
    };

    const isSafe = () => {
        const s = Hub.state();
        return !s.compromised && s.risk <= 70;
    };

    return Object.freeze({
        wait,
        guard,
        hardGuard,
        run,
        allow,
        user,
        isAdmin,
        risk,
        isSafe,
        onChange,
        onBreach
    });

})();

export default Secure;
