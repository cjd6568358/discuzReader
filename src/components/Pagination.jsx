import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const Pagination = ({ current, last, onPrevPress, onNextPress }) => {

    return (
        <>
            <View style={styles.sideButtonLeft}>
                <Pressable
                    style={[styles.pageButton, current === 1 && styles.pageButtonDisabled]}
                    onPress={onPrevPress}
                    disabled={current === 1}
                >
                    <Icon name="chevron-left" size={16} color="#FFFFFF" />
                </Pressable>
            </View>
            <View style={styles.sideButtonRight}>
                <Pressable
                    style={[styles.pageButton, current === last && styles.pageButtonDisabled]}
                    onPress={onNextPress}
                    disabled={current === last}
                >
                    <Icon name="chevron-right" size={16} color="#FFFFFF" />
                </Pressable>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    pageButton: {
        width: 40,
        height: 40,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageButtonDisabled: {
        opacity: 0.5,
    },
    sideButtonLeft: {
        position: 'absolute',
        left: 8,
        top: '50%',
        marginTop: -20,
        zIndex: 10,
    },
    sideButtonRight: {
        position: 'absolute',
        right: 8,
        top: '50%',
        marginTop: -20,
        zIndex: 10,
    },
    pageContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 16,
    },
    pageCount: {
        fontSize: 16,
        marginLeft: 4,
    },
});

export default Pagination;