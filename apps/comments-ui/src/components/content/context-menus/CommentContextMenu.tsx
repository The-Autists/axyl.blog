import AdminContextMenu from './AdminContextMenu';
import AuthorContextMenu from './AuthorContextMenu';
import NotAuthorContextMenu from './NotAuthorContextMenu';
import {Comment, useAppContext, useLabs} from '../../../AppContext';
import {useEffect, useRef} from 'react';

type Props = {
    comment: Comment;
    close: () => void;
    toggleEdit: () => void;
    isLastComment?: boolean;
};
const CommentContextMenu: React.FC<Props> = ({comment, close, toggleEdit, isLastComment}) => {
    const {member, admin} = useAppContext();
    const isAuthor = member && comment.member?.uuid === member?.uuid;
    const isAdmin = !!admin;
    const element = useRef<HTMLDivElement>(null);
    const labs = useLabs();
    
    useEffect(() => {
        const listener = () => {
            close();
        };

        // We need to listen for the window outside the iframe, and also the iframe window events
        window.addEventListener('click', listener, {passive: true});
        const el = element.current?.ownerDocument?.defaultView;

        if (el && el !== window) {
            el.addEventListener('click', listener, {passive: true});
        }

        return () => {
            window.removeEventListener('click', listener, {passive: true} as any);
            if (el && el !== window) {
                el.removeEventListener('click', listener, {passive: true} as any);
            }
        };
    }, [close]);

    useEffect(() => {
        const listener = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };
        // For keydown, we only need to listen to the main window, because we pass the events
        // manually in the Iframe component
        window.addEventListener('keydown', listener, {passive: true});

        return () => {
            window.removeEventListener('keydown', listener, {passive: true} as any);
        };
    }, [close]);

    // Prevent closing the context menu when clicking inside of it
    const stopPropagation = (event: React.SyntheticEvent) => {
        event.stopPropagation();
    };

    let contextMenu = null;
    if (comment.status === 'published') {
        if (isAuthor) {
            contextMenu = <AuthorContextMenu close={close} comment={comment} toggleEdit={toggleEdit} />;
        } else {
            if (isAdmin) {
                contextMenu = <AdminContextMenu close={close} comment={comment}/>;
            } else {
                contextMenu = <NotAuthorContextMenu close={close} comment={comment}/>;
            }
        }
    } else {
        if (isAdmin) {
            contextMenu = <AdminContextMenu close={close} comment={comment}/>;
        } else {
            return null;
        }
    }

    return (
        labs.commentImprovements ? (
            <div ref={element} className="relative" onClick={stopPropagation}>
                <div className={`absolute z-10 min-w-min whitespace-nowrap rounded bg-white p-1 font-sans text-sm shadow-lg outline-0 sm:min-w-[80px] dark:bg-neutral-800 dark:text-white ${isLastComment ? 'bottom-full mb-6' : 'top-0'}`}>
                    {contextMenu}
                </div>
            </div>
        ) : (
            <div ref={element} onClick={stopPropagation}>
                <div className="absolute z-10 min-w-min whitespace-nowrap rounded bg-white p-1 font-sans text-sm shadow-lg outline-0 sm:min-w-[80px] dark:bg-neutral-800 dark:text-white">
                    {contextMenu}
                </div>
            </div>
        )
    );
};

export default CommentContextMenu;