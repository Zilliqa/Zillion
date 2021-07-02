export const logger = function (...args: any) {
    console.log.apply(console, args);
}