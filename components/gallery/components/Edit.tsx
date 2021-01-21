import React, { useState, useEffect, ReactNode, useLayoutEffect } from 'react';
import { View, Image, StyleSheet, Pressable, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../../utils/styles';
import { galleryImgSizeLimit } from '../../../utils/variables';
import { NewGalleryItemProps, UserRootStateProps } from '../../../services/user/types';
import { connect } from 'react-redux';
import * as Progress from 'react-native-progress';
import { RootProps } from '../../../services';
import { save_gallery } from '../../../services/user/actions';
import { UserDispatchActionsProps } from '../../../services/user/types';
import { UtilsDispatchActionProps } from '../../../services/utils/tsTypes';
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { AutoId } from '../../../utils/functions';
import _ from 'lodash'
import { MeStackNavigationProp } from '../../navigation/utils/types';
import { set_banner } from '../../../services/utils/actions';
import { Feather } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { hashCode } from '../../../utils/functions';
import { Icon, CustomInput } from '../../../utils/components';

//Summary
//image limit will be set to 10000000 byte = 10mb
//need to lower the size
interface UploadImageProps {
    save_gallery: UserDispatchActionsProps['save_gallery'];
    gallery: UserRootStateProps['gallery'];
    navigation: MeStackNavigationProp;
    set_banner: UtilsDispatchActionProps['set_banner'];
}

const UploadImage = ({ save_gallery, gallery, navigation, set_banner }: UploadImageProps) => {
    const [imgObjs, setImgObjs] = useState<NewGalleryItemProps[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row', right: loading ? 30 : 20 }}>
                    {loading ?
                        <ActivityIndicator size='small' color={colors.primary} /> :
                        <>
                            <Pressable onPress={pickImage} style={{ marginRight: 10 }}>
                                {({ pressed }) => <Feather name='image' size={30} color={pressed ? colors.secondary : colors.primary} />}
                            </Pressable >
                            <Icon type='save' size={30} color={colors.primary} pressColor={colors.secondary} onPress={handleSaveGallery} />
                        </>
                    }
                </View>

            )
        })
    }, [loading, imgObjs])

    useEffect(() => {
        (async () => {

            gallery && setImgObjs(_.cloneDeep(gallery));

            try {
                const { status: CameraRollStatus } = await ImagePicker.requestCameraRollPermissionsAsync();

                if (CameraRollStatus !== 'granted') {
                    set_banner('Camera roll access denied. Will need access to edit gallery.', 'warning')
                }
            } catch (e) {
                set_banner('Oops! Something went wrong accessing your camera roll.', 'error')
            }
        })()

    }, [gallery])

    const handleSaveGallery = () => {
        //allow description to be empty
        //check if any changes were made

        if (_.isEqual(imgObjs, gallery)) {
            return set_banner('Looks like there were no changes found.', 'warning');
        }

        imgObjs.forEach((item, index) => {
            if ((!item.url && !item.blob) || !item.id) {
                return set_banner(`Oops! Looks like image #${index + 1} did not load correctly. Please try to remove and upload again.`, 'error')
            }
        })

        setLoading(true)

        save_gallery(imgObjs)
            .then(() => setLoading(false))
            .catch((err) => {
                console.log(err)
                setLoading(false)
            })
    }

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1
        });

        if (!result.cancelled) {

            //resize
            // const manipResult = await ImageManipulator.manipulateAsync(
            //     result.uri,
            //     [{ resize: { width: 500, height: 500 } }],
            //     { compress: 1, format:ß ImageManipulator.SaveFormat.PNG }
            // );
            const manipResult = await ImageManipulator.manipulateAsync(
                result.uri,
                [{ resize: { width: 600 } }],
                { compress: 1, format: ImageManipulator.SaveFormat.PNG }
            );

            //get blob
            var imgBlob: Blob;

            try {
                var response = await fetch(manipResult.uri)
                imgBlob = await response.blob();
            } catch (e) {
                console.log(e)
                return set_banner('Oops! Something went wrong fetching your image.', 'error')
            }

            if (imgBlob.size > galleryImgSizeLimit) {
                return set_banner('Image too large. Image must be 10mb or smaller.', 'warning');
            }

            //generate the image name

            //might be an issue if the user what's to adjust the photo in some way and resubmit it ** resolved .. realized manipulate will return a diff uri

            var name: string = hashCode(manipResult.uri)

            imgObjs.unshift({
                uri: manipResult.uri,
                blob: imgBlob,
                description: '',
                id: AutoId.newId(),
                name: name
            });

            setImgObjs([...imgObjs]);
        }
    };

    const handleRemoveGalleryItem = (id: string) => {
        //find item and set removed to true
        var index = imgObjs.findIndex(item => item.id === id);

        if (index !== undefined) {
            const { removed } = imgObjs[index]
            imgObjs[index].removed = removed ? false : true
        } else {
            return set_banner('Issues removing the image', 'error')
        }

        setImgObjs([...imgObjs])
    }

    const renderItem = ({ item, index, drag, isActive }: RenderItemParams<NewGalleryItemProps>): ReactNode => (
        <Pressable
            style={{
                alignItems: "center",
                justifyContent: "center",
            }}
            onLongPress={drag}
        >
            <View style={[styles.image_content, isActive && styles.image_content_drag]}>

                <Icon type={item.removed ? 'trash-2' : 'trash'} color={colors.red} pressColor={colors.lightRed} size={30} onPress={() => handleRemoveGalleryItem(item.id)} style={styles.trash} />

                <Image
                    source={{ uri: item.uri ? item.uri : item.cachedUrl ? item.cachedUrl : item.url, cache: 'force-cache' }} style={styles.image}
                />

                <CustomInput
                    styles={styles.image_description_input}
                    placeholder="Add a description... (100 character limit)"
                    multiline={true}
                    maxLength={100}
                    value={index !== undefined && imgObjs[index] ? imgObjs[index].description : ''}
                    onChangeText={(text) => {
                        if (index !== undefined) {
                            imgObjs[index].description = text
                            setImgObjs([...imgObjs])
                        } else {
                            set_banner('Dragging has not completed.', 'warning')
                        }
                    }}
                />
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView keyboardVerticalOffset={120} behavior={'height'} style={{ flex: 1 }}>
                <DraggableFlatList
                    contentContainerStyle={styles.flat_list}
                    keyboardDismissMode='interactive'
                    data={imgObjs}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `draggable-item-${item.id ? item.id : index.toString()}`}
                    onDragEnd={({ data }) => setImgObjs(data)}
                />
            </KeyboardAvoidingView>
        </View>
    )

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative'
    },
    flat_list: {
        padding: 50,
        paddingTop: 30,
        paddingBottom: 10,
    },
    trash: {
        position: 'absolute',
        top: 5,
        right: 5,
        zIndex: 10
    },
    add_image_container: {
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: `rgba(${colors.primary_rgb},.5)`,
        borderRadius: 5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.20,
        shadowRadius: 1.41,
        marginTop: 20,
        elevation: 2,
        backgroundColor: colors.primary,
        height: 300,
        width: 300,
        padding: 50,
    },
    button_container: {
        position: 'absolute',
        top: 25,
        alignSelf: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
        zIndex: 10,
        width: '60%'
    },
    scroll_view: {
        alignItems: 'center'
    },
    image_content: {
        marginBottom: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: `rgba(${colors.primary_rgb},.5)`,
        borderRadius: 5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.20,
        shadowRadius: 1.41,

        elevation: 2,
        backgroundColor: '#eee'
    },
    image_content_drag: {
        margin: 50,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.46,
        shadowRadius: 11.14,
        elevation: 5,
        backgroundColor: colors.lightGrey
    },
    image: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
    },
    image_description_input: {
        marginTop: 5,
        marginBottom: 5,
        fontSize: 12,
        alignSelf: 'flex-start',
        color: colors.black
    }
})

const mapStateToProps = (state: RootProps) => ({
    statusBar: state.utils.statusBar,
    gallery: state.user.gallery
})

export default connect(mapStateToProps, { save_gallery, set_banner })(UploadImage);