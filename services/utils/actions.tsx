import { SET_ERROR, REMOVE_ERROR, SET_LOADING, REMOVE_LOADING, SET_BANNER, SET_STATUS_BAR, REMOVE_BANNER } from './actionTypes';


export const set_error = (message: String, color: string) => ({
    type: SET_ERROR,
    payload: { message, color }
})

export const set_banner = (message: string, type: 'error' | 'warning' | 'success') => ({
    type: SET_BANNER,
    payload: {
        message,
        type
    }
})

export const remove_banner = () => ({
    type: REMOVE_BANNER
})

export const set_status_bar = (status: number) => ({
    type: SET_STATUS_BAR,
    payload: status
})

export const remove_error = () => ({
    type: REMOVE_ERROR
})

export const set_loading = {
    type: SET_LOADING
}

export const remove_loading = {
    type: REMOVE_LOADING
}

