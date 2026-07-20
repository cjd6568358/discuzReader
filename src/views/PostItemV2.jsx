import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import Swiper from 'react-native-swiper';
import RenderHtml, { HTMLElementModel, HTMLContentModel } from 'react-native-render-html';
import Icon from 'react-native-vector-icons/FontAwesome';
import { htmlToNodes } from '../utils/htmlToNodes';
import { downloadFile, userAgent } from '../utils/index';

const customHTMLElementModels = {
  font: HTMLElementModel.fromCustomModel({ contentModel: HTMLContentModel.block }),
  marquee: HTMLElementModel.fromCustomModel({ contentModel: HTMLContentModel.block }),
  object: HTMLElementModel.fromCustomModel({ contentModel: HTMLContentModel.block }),
  fieldset: HTMLElementModel.fromCustomModel({ contentModel: HTMLContentModel.block }),
  legend: HTMLElementModel.fromCustomModel({ contentModel: HTMLContentModel.block }),
};

const baseStyle = { fontSize: 16, lineHeight: 24, color: '#374151' };
const defaultViewProps = { style: { marginVertical: 8 } };

const htmlStyles = {
  p: { marginVertical: 8 },
  a: { color: '#2563EB', textDecorationLine: 'none' },
  img: { marginVertical: 8, maxWidth: 350, width: 'auto', height: 'auto', alignSelf: 'center' },
  blockquote: { borderLeftWidth: 4, borderLeftColor: '#E5E7EB', paddingLeft: 16, marginLeft: 0, color: '#6B7280' },
  pre: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 4 },
  code: { backgroundColor: '#F3F4F6', padding: 2, borderRadius: 4, fontFamily: 'monospace' },
  table: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, marginVertical: 8 },
  th: { backgroundColor: '#F9FAFB', padding: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  td: { padding: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  '.t_msgfont': { fontSize: 20, lineHeight: 1.6 },
  '.t_msgfont td': { fontSize: 20, lineHeight: 1.6 },
  '.t_msgfont li': { marginLeft: 16 },
  '.t_msgfont a': { color: '#2563EB' },
  '.t_bigfont': { fontSize: 24, lineHeight: 1.6 },
  '.t_smallfont': { fontSize: 16, lineHeight: 1.6 },
  div: { marginVertical: 4 },
};

// ── Inline Renderer ────────────────────────────────────────────

function InlineRenderer({ nodes, baseTextStyle, onLinkPress, onImagePress, imageHeaders }) {
  if (!nodes || nodes.length === 0) return null;

  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <Text key={index}>{node.content}</Text>;

      case 'br':
        return <Text key={index}>{'\n'}</Text>;

      case 'img': {
        const imgStyle = {
          width: Math.min(node.width, 350),
          height: node.height,
          marginVertical: 4,
          borderRadius: 4,
        };
        if (node.href && onImagePress) {
          return (
            <Text key={index} onPress={() => onImagePress(node.href)}>
              <Image source={{ uri: node.src, headers: imageHeaders }} style={imgStyle} resizeMode="contain" />
            </Text>
          );
        }
        return <Image key={index} source={{ uri: node.src, headers: imageHeaders }} style={imgStyle} resizeMode="contain" />;
      }

      case 'styled':
        return (
          <Text key={index} style={node.style}>
            <InlineRenderer
              nodes={node.children}
              baseTextStyle={baseTextStyle}
              onLinkPress={onLinkPress}
              onImagePress={onImagePress}
              imageHeaders={imageHeaders}
            />
          </Text>
        );

      case 'link':
        return (
          <Text
            key={index}
            style={{ color: '#2563EB' }}
            onPress={() => onLinkPress && onLinkPress(node.href)}
          >
            <InlineRenderer
              nodes={node.children}
              baseTextStyle={baseTextStyle}
              onLinkPress={onLinkPress}
              onImagePress={onImagePress}
              imageHeaders={imageHeaders}
            />
          </Text>
        );

      default:
        return null;
    }
  });
}

// ── Block Renderer ─────────────────────────────────────────────

function BlockRenderer({ block, contentWidth, baseTextStyle, onLinkPress, onImagePress, imageHeaders }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <Text style={[baseTextStyle, { marginVertical: 4 }]}>
          <InlineRenderer
            nodes={block.children}
            baseTextStyle={baseTextStyle}
            onLinkPress={onLinkPress}
            onImagePress={onImagePress}
            imageHeaders={imageHeaders}
          />
        </Text>
      );

    case 'blockquote':
      return (
        <View style={styles.blockquote}>
          <Text style={[baseTextStyle, { color: '#6B7280' }]}>
            <InlineRenderer
              nodes={block.children}
              baseTextStyle={baseTextStyle}
              onLinkPress={onLinkPress}
              onImagePress={onImagePress}
              imageHeaders={imageHeaders}
            />
          </Text>
        </View>
      );

    case 'pre':
      return (
        <View style={styles.pre}>
          <Text style={[baseTextStyle, { fontFamily: 'monospace', fontSize: 14 }]}>
            <InlineRenderer
              nodes={block.children}
              baseTextStyle={baseTextStyle}
              onLinkPress={onLinkPress}
              onImagePress={onImagePress}
              imageHeaders={imageHeaders}
            />
          </Text>
        </View>
      );

    case 'list':
      return (
        <View style={{ marginVertical: 4 }}>
          {block.children.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', marginVertical: 2 }}>
              <Text style={baseTextStyle}>
                {block.tag === 'ol' ? `${i + 1}. ` : '• '}
              </Text>
              <Text style={[baseTextStyle, { flex: 1 }]}>
                <InlineRenderer
                  nodes={item.children || item}
                  baseTextStyle={baseTextStyle}
                  onLinkPress={onLinkPress}
                  onImagePress={onImagePress}
                  imageHeaders={imageHeaders}
                />
              </Text>
            </View>
          ))}
        </View>
      );

    case 'listItem':
      return (
        <View style={{ flexDirection: 'row', marginVertical: 2 }}>
          <Text style={baseTextStyle}>{'• '}</Text>
          <Text style={[baseTextStyle, { flex: 1 }]}>
            <InlineRenderer
              nodes={block.children}
              baseTextStyle={baseTextStyle}
              onLinkPress={onLinkPress}
              onImagePress={onImagePress}
              imageHeaders={imageHeaders}
            />
          </Text>
        </View>
      );

    case 'table':
      // Table → fallback to react-native-render-html
      return (
        <RenderHtml
          contentWidth={contentWidth}
          source={{ html: block.html }}
          tagsStyles={htmlStyles}
          customHTMLElementModels={customHTMLElementModels}
          baseStyle={baseStyle}
          defaultViewProps={defaultViewProps}
        />
      );

    case 'hr':
      return <View style={styles.hr} />;

    default:
      return null;
  }
}

// ── PostItemV2 ─────────────────────────────────────────────────

const PostItemV2 = React.memo(({ item, width, cookies, pageData, onReplyPress, onLinkPress, onImageSwiperOpen, onImageViewerOpen }) => {
  const imageAttachments = [];
  const otherAttachments = [];
  item.attachments.forEach((att) => {
    if (att.icon.includes('image.gif')) {
      imageAttachments.push(att);
    } else {
      otherAttachments.push(att);
    }
  });
  const isFirstPost = item.floor === 1;

  const imageHeaders = useMemo(() => ({
    'User-Agent': userAgent,
    'Cookie': `cdb3_auth=${cookies.cdb3_auth?.value};`,
  }), [cookies]);

  const nodes = useMemo(() => htmlToNodes(item.content), [item.content]);

  const handleLinkPress = useCallback((href) => {
    if (onLinkPress) onLinkPress(href);
  }, [onLinkPress]);

  const handleImagePress = useCallback((src) => {
    const index = pageData.imgSrcList.indexOf(src);
    if (index !== -1) {
      onImageSwiperOpen(index);
    } else {
      onImageViewerOpen(src);
    }
  }, [pageData.imgSrcList, onImageSwiperOpen, onImageViewerOpen]);

  return (
    <Pressable onPress={() => onReplyPress(item)} style={styles.postContainer}>
      <View style={styles.authorContainer}>
        <Image source={{ uri: item.author.avatar }} style={styles.authorAvatar} />
        <View style={styles.authorInfo}>
          <View style={styles.authorNameContainer}>
            <Text style={styles.authorName}>{item.author.name}</Text>
            <View style={styles.authorBadge}>
              <Text style={styles.authorBadgeText}>{item.author.level}</Text>
            </View>
            <Text style={styles.replyNumber}>#{item.floor}</Text>
          </View>
          <Text style={styles.postTime}>{item.date}</Text>
        </View>
      </View>

      <View style={styles.postContent}>
        {nodes.map((block, index) => (
          <BlockRenderer
            key={index}
            block={block}
            contentWidth={width}
            baseTextStyle={baseStyle}
            onLinkPress={handleLinkPress}
            onImagePress={handleImagePress}
            imageHeaders={imageHeaders}
          />
        ))}
      </View>

      {item.attachments.length > 0 && (
        <View style={styles.attachmentContainer}>
          <Text style={styles.attachmentTitle}>附件</Text>
          {imageAttachments.length > 0 && cookies.cdb3_auth?.value && (
            <View style={styles.imageCarouselContainer}>
              <Swiper
                height={240}
                loop={true}
                autoplay={false}
                autoplayTimeout={4}
                showsButtons={false}
                paginationStyle={styles.swiperPagination}
                dotStyle={styles.swiperDot}
                activeDotStyle={styles.swiperActiveDot}
              >
                {imageAttachments.map((imgItem, index) => (
                  <Pressable
                    key={index}
                    style={styles.imageSlide}
                    onPress={() => onImageViewerOpen(imgItem.url || imgItem.link)}
                    onLongPress={() => downloadFile(imgItem.url || imgItem.link, imgItem.name)}
                  >
                    <Image
                      source={{
                        uri: imgItem.url || imgItem.link,
                        headers: imageHeaders,
                      }}
                      style={styles.carouselImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.imageCaption} numberOfLines={1}>{imgItem.name}</Text>
                  </Pressable>
                ))}
              </Swiper>
            </View>
          )}
          {otherAttachments.length > 0 && (
            <FlatList
              data={otherAttachments}
              keyExtractor={(att) => att.name}
              scrollEnabled={false}
              renderItem={({ item: att }) => (
                <Pressable
                  style={styles.attachmentItem}
                  onPress={() => downloadFile(att.url || att.link, att.name)}
                >
                  <View style={styles.attachmentIconContainer}>
                    {att.icon.includes('zip.gif') ? (
                      <Icon name="file-archive-o" size={20} color="#D97706" />
                    ) : (
                      <Icon name="file-o" size={20} color="#6B7280" />
                    )}
                  </View>
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentName} numberOfLines={1}>{att.name}</Text>
                    <View style={styles.attachmentMeta}>
                      <Text style={styles.attachmentSize}>{att.size}</Text>
                      <Text style={styles.attachmentDate}>{att.date}</Text>
                    </View>
                  </View>
                  {att.icon.includes('zip.gif') && <Icon name="download" size={16} color="#6B7280" />}
                </Pressable>
              )}
            />
          )}
        </View>
      )}

      {item.legend.length > 0 && (
        <View style={styles.rateContainer}>
          <Text style={styles.rateTitle}>评分</Text>
          {item.legend.map((rateItem, index) => (
            <View key={index} style={styles.rateItem}>
              <Icon name="trophy" size={14} color="#f7ba2a" style={styles.rateIcon} />
              <Text style={styles.rateText}>{rateItem}</Text>
            </View>
          ))}
        </View>
      )}

      {isFirstPost ? (
        <View style={styles.postStats}>
          {item.thanks > 0 && (
            <>
              <View style={styles.statItem}>
                <Icon name="heart" size={12} color="#FF0000" style={styles.statIcon} />
                <Text style={styles.statText}>{item.thanks} 感谢</Text>
              </View>
              <Text style={styles.statDivider}>|</Text>
            </>
          )}
          <View style={styles.statItem}>
            <Icon name="comment-o" size={14} color="#6B7280" style={styles.statIcon} />
            <Text style={styles.statText}>{(pageData?.pagination?.total || pageData.posts.length) - 1} 回复</Text>
          </View>
        </View>
      ) : (
        <View style={styles.replyFooter}>
          <View style={styles.replyActions}>
            <Pressable style={styles.replyAction} onPress={() => {
              onReplyPress(item, `回复 ${item.floor}楼 的帖子`);
            }}>
              <Icon name="comment-o" size={14} color="#6B7280" style={styles.actionIcon} />
              <Text style={styles.actionText}>回复</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  postContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  authorBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#EBF5FF',
    borderRadius: 4,
    marginRight: 'auto',
  },
  authorBadgeText: {
    fontSize: 12,
    color: '#2563EB',
  },
  replyNumber: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  postContent: {
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 4,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statDivider: {
    marginHorizontal: 16,
    color: '#6B7280',
  },
  replyFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 12,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 16,
  },
  replyAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Attachment styles
  attachmentContainer: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  attachmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  attachmentMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  attachmentSize: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  attachmentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Carousel styles
  imageCarouselContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imageSlide: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  imageCaption: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#FFFFFF',
    fontSize: 12,
    padding: 4,
    textAlign: 'center',
  },
  swiperPagination: {
    bottom: 5,
  },
  swiperDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 3,
    marginRight: 3,
  },
  swiperActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 3,
    marginRight: 3,
  },
  // Rate styles
  rateContainer: {
    marginTop: 16,
    padding: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  rateTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rateIcon: {
    marginRight: 8,
  },
  rateText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  // Block styles
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 12,
    marginVertical: 8,
  },
  pre: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  hr: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
});

export default PostItemV2;
