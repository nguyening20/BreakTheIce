import { SET_ERROR, REMOVE_ERROR, SET_LOADING, REMOVE_LOADING } from './actionTypes';


export const set_error = (message: String, color: string) => ({
    type: SET_ERROR,
    payload: { message, color }
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

