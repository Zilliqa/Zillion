import React from 'react'
import { toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

function Alert(type: string, message: string) {
    switch (type) {
        case 'error':
            return toast.error(
            <div>{message}</div>
            );
        default:
            return toast(message);
    }
}

export default Alert;