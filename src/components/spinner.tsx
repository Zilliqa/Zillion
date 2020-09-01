import React from 'react';
import { usePromiseTracker } from "react-promise-tracker";

const Spinner = (props: any) => {
    const { promiseInProgress } = usePromiseTracker({ area: props.area, delay: 0 });

    return (
        promiseInProgress ? (
            <div className={props.class ? props.class : 'spinner-border'} role="status">
                <span className="sr-only">Loading...</span>
            </div>
        ) : null
    );
};

export default Spinner;