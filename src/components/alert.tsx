import React from 'react'
import { toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

function Alert(type: string, message: string) {
    switch (type) {
        case 'info':
            return toast.info(<div>{message}</div>);
        case 'error':
            return toast.error(<div>{message}</div>);
        case 'success':
            return toast.success(<div>{message}</div>);
        case 'warn':
            return toast.warn(<div>{message}</div>);
        default:
            return toast(message);
    }
}

export default Alert;