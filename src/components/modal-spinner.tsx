import React from 'react';

// for use without promise tracker
// see @Spinner for an implementation with promise tracker
const ModalSpinner = (props: any) => {
    return (
        <div className={props.class ? props.class : 'spinner-border'} role="status">
            <span className="sr-only">Loading...</span>
        </div>
    )
};

export default ModalSpinner;