export const createTaskScheduler = () => {
    const scheduledTasks = new Map();
    return (payload) => {
        const { taskId, delayMs, maxJitterMs, callback, } = payload;
        const jitter = Math.ceil(Math.random() * (maxJitterMs || 0));
        const timer = scheduledTasks.get(taskId);
        if (timer) {
            clearTimeout(timer);
        }
        const newTimer = setTimeout(() => {
            callback();
            scheduledTasks.delete(taskId);
        }, delayMs + jitter);
        scheduledTasks.set(taskId, newTimer);
    };
};
export const scheduleTask = createTaskScheduler();
