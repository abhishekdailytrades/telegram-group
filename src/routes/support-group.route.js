require("dotenv").config();
const express = require("express");
const router = express.Router();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram");

const apiId = Number(process.env.TG_APIID);
const apiHash = process.env.TG_APIHASH;
const stringSession = new StringSession(process.env.TG_SESSION || "");

const ADMIN_NUMBER = process.env.ADMIN_NUMBER;
const ADVISOR_NUMBER = process.env.ADVISOR_NUMBER;

let client;

// Initialize Telegram client
(async () => {
  try {
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      debug: true, // Enable debug logs for troubleshooting
    });
    await client.connect();
    if (!(await client.isUserAuthorized())) {
      console.log("❌ Session not authorized");
      throw new Error("Session is not authorized. Please generate a valid TG_SESSION.");
    }
    console.log("✅ Telegram client connected");
  } catch (err) {
    console.error("❌ Telegram init error:", err);
    client = null; 
  }
})();

router.post("/create-group", async (req, res) => {
  try {
   
    if (!apiId || !apiHash || !ADMIN_NUMBER || !ADVISOR_NUMBER || !process.env.TG_SESSION) {
      return res.status(400).json({
        success: false,
        message: "Missing required environment variables (TG_APIID, TG_APIHASH, ADMIN_NUMBER, ADVISOR_NUMBER, or TG_SESSION)",
      });
    }


    const userPhone = "+917060955045";
    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message: "User phone number is required",
      });
    }

    // Ensure client is connected
    console.log("Checking client connection...");
    if (!client || !(await client.isUserAuthorized())) {
      return res.status(401).json({
        success: false,
        message: "Telegram client is not connected or authorized",
      });
    }
    console.log("Client is authorized");

    // Create supergroup
    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title: "Supporting Private Group",
        about: "Private support group created via API",
        megagroup: true,
      })
    );

    const chat = result.chats[0];
    if (!chat) {
      return res.status(500).json({
        success: false,
        message: "Failed to create group or fetch group details",
      });
    }

    const groupId = chat.id.toString();
    const formattedGroupId = `-100${groupId}`; // Format for supergroups
    const accessHash = chat.accessHash.toString();
    console.log("Created group:", { groupId: formattedGroupId, accessHash });

    // Add admin, advisor, and user to the group
    const phoneNumbersToAdd = [ADMIN_NUMBER, ADVISOR_NUMBER, userPhone];
    for (const phone of phoneNumbersToAdd) {
      try {
        // Resolve user by phone number
        const userResult = await client.invoke(
          new Api.contacts.ResolvePhone({
            phone,
          })
        );

        if (userResult.users && userResult.users[0]) {
          const user = userResult.users[0];
          await client.invoke(
            new Api.channels.InviteToChannel({
              channel: new Api.InputPeerChannel({
                channelId: chat.id,
                accessHash: chat.accessHash,
              }),
              users: [user],
            })
          );
          
          if (phone === ADMIN_NUMBER || phone === ADVISOR_NUMBER) {
            await client.invoke(
              new Api.channels.EditAdmin({
                channel: new Api.InputPeerChannel({
                  channelId: chat.id,
                  accessHash: chat.accessHash,
                }),
                userId: user,
                adminRights: new Api.ChatAdminRights({
                  changeInfo: true,
                  postMessages: true,
                  editMessages: true,
                  deleteMessages: true,
                  banUsers: true,
                  inviteUsers: true,
                  pinMessages: true,
                  addAdmins: true,
                }),
                rank: phone === ADMIN_NUMBER ? "Admin" : "Advisor",
              })
            );
          }
          console.log(`✅ Added user ${phone} to group`);
        } else {
          console.warn(`⚠️ Skipping user ${phone}: Phone not registered`);
        }
      } catch (err) {
        console.error(`❌ Error adding user ${phone}:`, err);
      }
    }

    // Create invite link with join request
    const exportResult = await client.invoke(
      new Api.messages.ExportChatInvite({
        peer: new Api.InputPeerChannel({
          channelId: chat.id,
          accessHash: chat.accessHash,
        }),
        expireDate: 0,
        usageLimit: 0,
        requestNeeded: true,
        title: "Secure Invite",
      })
    );

    const inviteLink = exportResult.link;

    // Handle join requests
    client.addEventHandler(async (update) => {
      if (update.className === "UpdateBotChatInviteRequester") {
        const user = update.user;
        const userPhoneFromUpdate = user.phone ? `+${user.phone}` : null;

        if (userPhoneFromUpdate === userPhone) {
          await client.invoke(
            new Api.messages.HideChatJoinRequest({
              peer: new Api.InputPeerChannel({
                channelId: chat.id,
                accessHash: chat.accessHash,
              }),
              userId: user.id,
              approved: true,
            })
          );
          console.log(`✅ Approved join request for: ${userPhoneFromUpdate}`);
        } else {
          await client.invoke(
            new Api.messages.HideChatJoinRequest({
              peer: new Api.InputPeerChannel({
                channelId: chat.id,
                accessHash: chat.accessHash,
              }),
              userId: user.id,
              approved: false,
            })
          );
          console.log(`❌ Rejected join request for: ${userPhoneFromUpdate || "unknown"}`);
        }
      }
    });

    // Set default banned rights
    await client.invoke(
      new Api.messages.EditChatDefaultBannedRights({
        peer: new Api.InputPeerChannel({
          channelId: chat.id,
          accessHash: chat.accessHash,
        }),
        bannedRights: new Api.ChatBannedRights({
          viewMessages: false,
          sendMessages: false,
          sendMedia: false,
          sendStickers: false,
          sendGifs: false,
          sendGames: false,
          sendInline: false,
          embedLinks: false,
          inviteUsers: false,
          untilDate: 0,
        }),
      })
    );

    res.json({
      success: true,
      groupId: formattedGroupId, 
      accessHash,
      inviteLink,
      message: "Group created successfully. Only the specified user can join via the invite link.",
    });
  } catch (err) {
    console.error("❌ Error creating group:", err);
    if (err.errorMessage?.includes("FLOOD_WAIT")) {
      const waitTime = err.seconds || 60;
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Please wait ${waitTime} seconds.`,
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});


router.post("/disable-user-chat", async (req, res) => {
  try {
    const { userPhone, groupId, accessHash } = req.body;
    if (!userPhone || !groupId || !accessHash) {
      return res.status(400).json({
        success: false,
        message: "userPhone, groupId, and accessHash are required in request body",
      });
    }

    if (!client || !(await client.isUserAuthorized())) {
      return res.status(401).json({
        success: false,
        message: "Telegram client is not connected or authorized",
      });
    }

    let user;
    try {
      const userResult = await client.invoke(
        new Api.contacts.ResolvePhone({
          phone: userPhone,
        })
      );

      if (!userResult.users || !userResult.users[0]) {
        return res.status(404).json({
          success: false,
          message: `User with phone ${userPhone} not found`,
        });
      }
      user = userResult.users[0];
    } catch (err) {
      if (err.errorMessage === 'PHONE_NOT_OCCUPIED') {
        return res.status(404).json({
          success: false,
          message: `Phone number ${userPhone} is not registered on Telegram`,
        });
      }
      throw err;
    }

    // Validate groupId format (should start with -100 for supergroups)
    if (!groupId.startsWith('-100')) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupId format. Must start with -100 for supergroups",
      });
    }


    const channel = new Api.InputPeerChannel({
      channelId: BigInt(groupId.replace('-100', '')),
      accessHash: BigInt(accessHash),
    });


    try {
      await client.invoke(
        new Api.channels.GetFullChannel({
          channel,
        })
      );
    } catch (err) {
      if (err.errorMessage === 'CHANNEL_INVALID') {
        return res.status(400).json({
          success: false,
          message: `Invalid or inaccessible group ID: ${groupId}`,
        });
      }
      throw err;
    }

    await client.invoke(
      new Api.channels.EditBanned({
        channel,
        participant: new Api.InputPeerUser({
          userId: user.id,
          accessHash: user.accessHash,
        }),
        bannedRights: new Api.ChatBannedRights({
          viewMessages: false, // Allow viewing
          sendMessages: true, // Ban sending messages
          sendMedia: true,
          sendStickers: true,
          sendGifs: true,
          sendGames: true,
          sendInline: true,
          embedLinks: true,
          untilDate: 0, // Permanent restriction
        }),
      })
    );

    res.json({
      success: true,
      message: `Chat disabled for user ${userPhone} in group ${groupId}`,
    });
  } catch (err) {
    console.error("❌ Error disabling user chat:", err);
    if (err.errorMessage?.includes("FLOOD_WAIT")) {
      const waitTime = err.seconds || 60;
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Please wait ${waitTime} seconds.`,
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});


router.post("/delete-group/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { accessHash } = req.body; // Expect accessHash in request body
    if (!groupId || !accessHash) {
      return res.status(400).json({
        success: false,
        message: "groupId and accessHash are required",
      });
    }

    if (!client || !(await client.isUserAuthorized())) {
      return res.status(401).json({
        success: false,
        message: "Telegram client is not connected or authorized",
      });
    }

    if (!groupId.startsWith('-100')) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupId format. Must start with -100 for supergroups",
      });
    }

    const channel = new Api.InputPeerChannel({
      channelId: BigInt(groupId.replace('-100', '')),
      accessHash: BigInt(accessHash),
    });


    try {
      await client.invoke(
        new Api.channels.GetFullChannel({
          channel,
        })
      );
    } catch (err) {
      if (err.errorMessage === 'CHANNEL_INVALID') {
        return res.status(400).json({
          success: false,
          message: `Invalid or inaccessible group ID: ${groupId}`,
        });
      }
      throw err;
    }

    await client.invoke(
      new Api.channels.DeleteChannel({
        channel,
      })
    );

    res.json({
      success: true,
      message: `Group ${groupId} deleted successfully`,
    });
  } catch (err) {
    console.error("❌ Error deleting group:", err);
    if (err.errorMessage?.includes("FLOOD_WAIT")) {
      const waitTime = err.seconds || 60;
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Please wait ${waitTime} seconds.`,
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;