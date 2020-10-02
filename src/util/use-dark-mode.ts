import { useState, useEffect, useCallback } from 'react';

const useDarkMode = (initialValue = true) => {
    const [darkMode, setDarkMode] = useState(() => {
        // try to load from local storage or if the document element has already been set
        try {
            // try to get from local storage
            const item = window.localStorage.getItem("dark-theme");

            // try to get from existing attribute
            const currTheme = document.documentElement.getAttribute('data-theme');

            if (item) {
                return JSON.parse(item);

            } else if (currTheme !== null && currTheme !== '') {
                if (currTheme === 'dark') {
                    return true;
                } else {
                    return false;
                }

            } else {
                return initialValue
            }

        } catch (err) {
            return initialValue;
        }
    });

    useEffect(() => {
        window.localStorage.setItem("dark-theme", JSON.stringify(darkMode));
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [darkMode]);

    return {
        value: darkMode,
        enable: useCallback(() => {
                    setDarkMode(true);
                    // document.documentElement.setAttribute('data-theme', 'dark');
                }, [setDarkMode]),
        disable: useCallback(() => {
                    setDarkMode(false);
                    // document.documentElement.setAttribute('data-theme', 'light');
                }, [setDarkMode]),
    }
}

export default useDarkMode;