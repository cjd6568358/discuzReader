export default {
    index: `
    head title{$documentTitle};
    head link[rel=apple-touch-icon][href=$iconUrl];
    #announcementbody>li@announcementList{
        a[href=$href]{$name}
    }
    .mainbox.forumlist@sectionList{
        h3 a{$name};
        .headactions .notabs@moderators{
            &{$}
        };
        tbody@children{
            h2 a[href=$href]{$name}
            h2 em{$today}
            h2+p{$desc|replace(/\\n/g, '')}
            h2+p+p:not(.moderators) a@children{
                &[href=$href]{$name};
            };
            p.moderators .notabs@moderators{
                &{$}
            };
            td.nums:nth-of-type(1){$thread|Number};
            td.nums:nth-of-type(2){$post|Number};
            td.lastpost>a[href=$lastpost_id|replace(/^.*tid=(.*)&goto.*$/g,'$1')|Number]{$lastpost_name}
            td.lastpost>cite a{$lastpost_author}
            td.lastpost>cite{$lastpost_date|split(' - ')|slice(1,2)|first}
        }
    };
    #creditlist_menu>li@creditList{
        &{$}
    };
    #nav cite a{$username}
    `,
    pm: `
    #pmlist tr[id]@pmList{
        td:nth-child(2) a[id=$id|replace('pm_view_','')|Number]{$title};
        td:nth-child(2)[style]{$unread = 1};
        td:nth-child(3) a{$from};
        td:nth-child(4){$date};
    }
    `,
    favorites: `
    .mainbox form tbody tr@{
        td:nth-child(2) a[href=$tid|split('-')|slice(1,2)|first];
    }
    `,
    forum: `
    .mainbox.threadlist h1 a{$documentTitle};
    #newpmnum{$newMessage|Number};
    #nav p:first-child a@breadcrumb{
        &[href=$href]{$name}
    };
    #ajax_favorite[href=$favorite_href];
    // .mainbox.forumlist tbody:has(.lastpost a)@forumList{
    //     h2 a[href=$href]{$name}
    // }
    // .mainbox.threadlist table:has(thead.separation)@threadList{
    //     thead.separation td b{$name};
    //     tbody:has(th)@value{
    //         th span[id^=thread_] a[href=$href]{$title};
    //         .nums{$nums};
    //         td.icon img[alt=$type];
    //         span.bold{$permission|Number}
    //         .author cite{html($thanks|replace(/<a(.*)absmiddle">/g,'')|Number)}
    //         .author em{$date}
    //     }
    // };
    // .mainbox.threadlist+.pages_btns .pages@pageInfo|pack{
    //     $pageNum = 1;
    //     $pageCount = 1;
    //     strong{$pageNum|Number};
    //     em{$pageCount|Number|MathCeil};
    // }
    `,
    thread: `
    filter MathCeil() {
        return Math.ceil(this/10)
    };
    form input[name=formhash][value=$formhash];
    #postform[action=$replyUrl];
    form+.pages_btns .threadflow a:nth-of-type(1)[href=$prevTopicUrl];
    form+.pages_btns .threadflow a:nth-of-type(2)[href=$nextTopicUrl];
    #ajax_favorite[href=$favoriteUrl];
    #newspecial_menu li:nth-of-type(1) a[href=$newThreadUrl];
    head title{$documentTitle};
    form .mainbox.viewthread@postList{
        .postauthor cite a[id^=userinfo]{$authorName};
        .postauthor p:nth-of-type(1){$authorLevel};
        .postcontent .postinfo strong[id=$pid|replace(/postnum_/g,'')][onclick=$absPostUrl|replace(/',.*/g,'')|match(/viewth.*/g)|first]{$postFloor}
        .postcontent .postinfo{find('小',$postTime|replace(/^.*发表于 /g,''), '只看该作者')}
        .postcontent .postmessage>h2{html($postTitle)}
        .postcontent .postmessage .notice{html($content|replace(/border(.*)alt=""/g,""))}
        .postcontent .postmessage .t_msgfont{html($content|replace(/border(.*)alt=""/g,""))}
    };
    form+.pages_btns .pages@pageInfo|pack{
        $pageNum = 1;
        $pageCount = 1;
        $total = 1;
        strong{$pageNum|Number};
        em{$pageCount|Number|MathCeil};
        em{$total|Number};
    }
    `,
    my: `
    .credits_info ul>li@creditList{
        &{$|trim()}
    };
    #wrapper #menu ul li:nth-child(2) a[href=$formhash|split('formhash=')|slice(1,2)|first];
    #menu li cite a{$username};
    .mainbox table:nth-of-type(1) tbody tr@recentTopics{
        td:nth-child(1) a[href=$href]{$title}
        td:nth-child(1) a[href=$tid|split('-')|slice(1,2)|first];
        td:nth-child(2){$forum}
        td:nth-child(3) a[href=$lastPostUrl]{$lastPost}
        td:nth-child(4){$status}
    };
    .mainbox table:nth-of-type(2) tbody tr@recentReply{
        td:nth-child(1) a[href=$href]{$title}
        td:nth-child(1) a[href=$tid|replace(/^redirect.*ptid=/g,'')];
        td:nth-child(2){$forum}
        td:nth-child(3){$lastPost}
        td:nth-child(4){$status}
    }
    `,
    search: `
    filter MathCeil() {
      return Math.ceil(this/38)
    };
    .mainbox.threadlist tbody@threadList{
        th a[href=$href];
        th a[href=$tid|replace('viewthread.php?tid=','')|replace(/&highlight=.*$/g,'')]{$title};
        td.author em{$date};
        td.nums{$nums};
    };
    .mainbox.threadlist[class=$searchHref]{
        $pageCount = 1;
    };
    .mainbox.threadlist tbody th[colspan="6"]{
        $pageCount = 0;
    };
    .mainbox.threadlist+.pages_btns .pages em{$pageCount|Number|MathCeil};
    .mainbox.threadlist+.pages_btns .pages a:nth-of-type(1)[href=$searchHref];
    `
}