import React from 'react';

function IconLedger(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={props.width ? props.width : "16"} height={props.height ? props.height : "16"} viewBox="0 0 28.075 28.167" className={props.className}>
            <path d="M23.64,0H10.683V17.387H28.07V4.522A4.51,4.51,0,0,0,23.64,0ZM6.7,0H4.533A4.544,4.544,0,0,0,0,4.533V6.7H6.7ZM0,10.775H6.7v6.7H0ZM21.371,28.162h2.171a4.544,4.544,0,0,0,4.533-4.533V21.463h-6.7v6.7Zm-10.688-6.7h6.7v6.7h-6.7ZM0,21.463v2.171a4.544,4.544,0,0,0,4.533,4.533H6.7v-6.7Z" />
        </svg>
    );
}

export default IconLedger;